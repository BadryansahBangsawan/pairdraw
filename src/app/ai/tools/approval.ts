import type { PermissionOption, ToolKind } from '@agentclientprotocol/sdk'

import { toolChangesDocument, type ToolDef } from '@open-pencil/core/tools'
import { agentMessages } from '@open-pencil/vue/i18n'

import { requestPermissionFromUser } from '@/app/ai/agents/acp/permission'
import { approveActions } from '@/app/ai/chat/preferences'
import type { MCPToolCallRequest } from '@/app/integrations/mcp/client/tools'

/** What the model reads when the person declined a call. */
export const ACTION_DECLINED =
  'The user declined this action, so nothing was changed. Do not retry it; ask what to do instead.'
/** What the model reads when nobody answered the request, which says nothing of the person's wish. */
export const ACTION_UNANSWERED =
  'The user did not answer the request to run this action in time, so it did not run and nothing was changed. Ask whether to go ahead before trying it again.'

/**
 * How long a request waits for an answer. A stopped reply already withdraws its requests, so
 * this only ends a wait nobody is there for; it is long enough to read a large call first.
 */
export const ACTION_APPROVAL_TIMEOUT_MS = 10 * 60_000

const ALLOW_ONCE = 'allow'
const ALLOW_ALWAYS = 'allow-always'
const REJECT = 'reject'

/** Whether a call may run: allowed, declined by the person, or left unanswered. */
export type ActionApprovalOutcome = 'allowed' | 'declined' | 'unanswered'

/** The tool result the model reads for a call that did not run. */
export function actionRefusal(outcome: Exclude<ActionApprovalOutcome, 'allowed'>): string {
  return outcome === 'declined' ? ACTION_DECLINED : ACTION_UNANSWERED
}

export interface ActionApprovalOptions {
  /** Names the chat in the request, as an agent's session id names its session. */
  chatId: string
  /** Called when a request waited a few seconds unanswered, to notify the person. */
  onUnanswered?: (tool: string) => void
}

interface ApprovalRequest {
  /** The tool the dialog names. */
  name: string
  /**
   * What "Always allow" remembers for the rest of the chat. A browser action remembers the
   * page's host, so a later action on another host still asks. Other tools remember their name.
   */
  remember?: string
  kind: ToolKind
  args: Record<string, unknown>
  toolCallId: string
  description: string
}

/**
 * Per-action approval for the built-in chat, which Settings → AI turns on. A call that changes
 * the document, or an external MCP server's tool that does not say it only reads, waits for
 * Allow or Deny in the same dialog coding agents' permission requests use; "Always allow" covers
 * that tool for the rest of the chat. Reading calls never ask.
 */
export function createActionApproval({ chatId, onUnanswered }: ActionApprovalOptions) {
  const alwaysAllowed = new Set<string>()
  let pending = new AbortController()

  async function ask({
    name,
    remember,
    kind,
    args,
    toolCallId,
    description
  }: ApprovalRequest): Promise<ActionApprovalOutcome> {
    const remembered = remember ?? name
    if (!approveActions.value || alwaysAllowed.has(remembered)) return 'allowed'
    const messages = agentMessages.get()
    const options: PermissionOption[] = [
      { optionId: ALLOW_ONCE, kind: 'allow_once', name: messages.approveOnce },
      {
        optionId: ALLOW_ALWAYS,
        kind: 'allow_always',
        name: messages.approveAlways({ tool: remembered })
      },
      { optionId: REJECT, kind: 'reject_once', name: messages.approveReject }
    ]
    // Set from the timer, which the request's answer alone cannot tell apart from a Deny.
    const wait = { timedOut: false }
    const { outcome } = await requestPermissionFromUser(
      { sessionId: chatId, toolCall: { toolCallId, title: name, kind, rawInput: args }, options },
      onUnanswered ? () => onUnanswered(name) : undefined,
      {
        signal: pending.signal,
        description,
        timeoutMs: ACTION_APPROVAL_TIMEOUT_MS,
        onTimeout: () => {
          wait.timedOut = true
        }
      }
    )
    if (wait.timedOut) return 'unanswered'
    if (outcome.outcome !== 'selected') return 'declined'
    if (outcome.optionId === ALLOW_ALWAYS) alwaysAllowed.add(remembered)
    return outcome.optionId === ALLOW_ONCE || outcome.optionId === ALLOW_ALWAYS
      ? 'allowed'
      : 'declined'
  }

  /** Whether a built-in tool call may run; reading calls always may. */
  async function approve(
    def: ToolDef,
    args: Record<string, unknown>,
    toolCallId: string
  ): Promise<ActionApprovalOutcome> {
    if (!toolChangesDocument(def)) return 'allowed'
    return ask({
      name: def.name,
      kind: 'edit',
      args,
      toolCallId,
      description: agentMessages.get().approvalRequest({ tool: def.name })
    })
  }

  /**
   * Whether a browser action may change the open page. "Always allow" covers that page's host
   * for the rest of this chat, not the tool, so the same click on another site still asks.
   * Reading the page does not come through here.
   */
  async function approveBrowser(
    tool: string,
    host: string,
    args: Record<string, unknown>,
    toolCallId: string
  ): Promise<ActionApprovalOutcome> {
    return ask({
      name: tool,
      remember: host,
      kind: 'edit',
      args,
      toolCallId,
      description: agentMessages.get().approvalRequestPage({ tool, page: host })
    })
  }

  /**
   * Whether an external MCP server's tool call may run. Only a tool the server marks read-only
   * runs without asking, since what the others change is outside the app's view.
   */
  async function approveExternal(request: MCPToolCallRequest): Promise<boolean> {
    if (request.readOnly) return true
    const outcome = await ask({
      name: request.name,
      kind: 'other',
      args: request.input,
      toolCallId: request.toolCallId,
      description: agentMessages
        .get()
        .approvalRequestExternal({ tool: request.tool, server: request.server })
    })
    return outcome === 'allowed'
  }

  /** Declines every request still waiting, as when the reply that made them stops. */
  function cancelPending(): void {
    pending.abort()
    pending = new AbortController()
  }

  return { approve, approveBrowser, approveExternal, cancelPending }
}

export type ActionApproval = ReturnType<typeof createActionApproval>
