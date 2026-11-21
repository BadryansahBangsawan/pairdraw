import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
import type {
  Client,
  Agent,
  SessionNotification,
  RequestPermissionRequest,
  RequestPermissionResponse,
  Usage
} from '@agentclientprotocol/sdk'
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'
import * as v from 'valibot'

import type { ACPAgentDef } from '@pairdraw/core/constants'
import { aiMessages } from '@pairdraw/vue/i18n'

import { AgentSignInRequiredError } from '@/app/ai/agents/acp/auth/required'
import { parseAuthStatusUpdate } from '@/app/ai/agents/acp/auth/status'
import { setAgentCommands } from '@/app/ai/agents/acp/commands'
import { createUpdateMapper } from '@/app/ai/agents/acp/events'
import { sessionModel } from '@/app/ai/agents/acp/session/controls'
import {
  agentSessionControls,
  noteAgentSessionUpdate,
  sessionControlSetter,
  startAgentSessionControls
} from '@/app/ai/agents/acp/session/store'
import { linkOwnTools } from '@/app/ai/agents/acp/tools'
import { agentHost } from '@/app/ai/agents/host/current'
import type { AgentHost, AgentStreams } from '@/app/ai/agents/host/types'
import SYSTEM_PROMPT from '@/app/ai/chat/system-prompt'
import { endRun, forgetAgentChat, startAgentRun } from '@/app/ai/reply/run'
import { AgentStartupTimeoutError, raceStartup } from '@/app/ai/transports/deadline'
import { forgetChatAgent, nameChatAgent } from '@/app/automation/agents'
import { describeDiagnosticError, recordACPTransportFailure } from '@/app/diagnostics'
import type { EditorStore } from '@/app/editor/active-store'
import { APP_NAME } from '@/constants'

interface ACPSession {
  connection: ClientSideConnection
  sessionId: string
  /** The id the agent's tool calls carry, which ties them to this chat's replies. */
  chat: string
  agent: AgentStreams
  onUpdate: ((params: SessionNotification) => void) | null
  dead: boolean
  /** The model the agent says it uses, once it has said; Codex names it, Claude in its usage. */
  model: string | null
  /** Unlinks the composer's model, reasoning, and mode pickers from this session. */
  endControls: () => void
}

/** One agent turn's tokens, as an ACP agent reports them with its answer to the prompt. */
export interface AgentTurnUsage {
  model: string | null
  /** All input tokens, cached ones included, as the AI SDK counts a provider model's input. */
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number | null
  cacheWriteTokens: number | null
}

/**
 * The agents report fresh input apart from cache reads and writes; the chat's other models count
 * all of it as input, with the cached part broken out.
 */
export function agentTurnUsage(usage: Usage, model: string | null): AgentTurnUsage {
  const cacheReadTokens = usage.cachedReadTokens ?? null
  const cacheWriteTokens = usage.cachedWriteTokens ?? null
  return {
    model,
    inputTokens: usage.inputTokens + (cacheReadTokens ?? 0) + (cacheWriteTokens ?? 0),
    outputTokens: usage.outputTokens,
    cacheReadTokens,
    cacheWriteTokens
  }
}

const usageMetaSchema = v.object({ '_claude/model': v.string() })

function isMissingCommandError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('enoent') || normalized.includes('program not found')
}

function missingCommandMessage(agentDef?: ACPAgentDef): string {
  const ai = aiMessages.get()
  if (!agentDef) return ai.chatAcpNotInstalled
  if (!agentDef.installCommand) return ai.chatAcpInstallAndRestart({ command: agentDef.command })
  return ai.chatAcpInstallWith({
    command: agentDef.command,
    installCommand: agentDef.installCommand
  })
}

export function formatConnectionError(e: unknown, agentDef?: ACPAgentDef): string {
  const msg = e instanceof Error ? e.message : String(e)
  const ai = aiMessages.get()
  if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('fetch failed') ||
    msg.includes('Failed to fetch')
  ) {
    return ai.chatAcpNotRunning
  }
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('ETIMEDOUT')) {
    return ai.chatAcpTimeout
  }
  if (isMissingCommandError(msg)) {
    return missingCommandMessage(agentDef)
  }
  if (isAuthRequiredError(e)) {
    if (agentDef?.ownCredentials) return ai.chatAgentUnconfigured({ agent: agentDef.name })
    return ai.chatAcpSignInRequired({ agent: agentDef?.name ?? 'The agent' })
  }
  return msg
}

/** ACP's `auth_required` error, which an agent returns for a new session before sign-in. */
function isAuthRequiredError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && e.code === -32000
}

/** The agent never opened its session with Pairdraw's MCP server, so it has no design tools. */
function toolsUnreachableError(agentDef: ACPAgentDef, reason: string | null): Error {
  return new Error(
    `${agentDef.name} couldn't reach ${APP_NAME}'s tools, so your message wasn't sent.` +
      (reason ? ` ${agentDef.name} reported: ${reason}` : '')
  )
}

function startupError(error: unknown, agentDef: ACPAgentDef): Error {
  recordACPTransportFailure({ operation: 'start', ...describeDiagnosticError(error) })
  // A start that ran out of time is its own reason, which the chat names.
  if (error instanceof AgentStartupTimeoutError) return error
  const message = formatConnectionError(error, agentDef)
  // The chat tells a signed-out agent apart, so it can show where to sign in.
  return isAuthRequiredError(error)
    ? new AgentSignInRequiredError(message, agentDef.ownCredentials === true)
    : new Error(message)
}

export function buildCrashChunks(
  destroying: boolean,
  textId: string,
  textStarted: boolean
): { chunks: UIMessageChunk[]; shouldNullSession: boolean } {
  if (destroying) return { chunks: [], shouldNullSession: false }
  const chunks: UIMessageChunk[] = []
  if (textStarted) chunks.push({ type: 'text-end', id: textId })
  chunks.push({ type: 'error', errorText: 'Agent process exited unexpectedly.' })
  chunks.push({ type: 'finish-step' })
  chunks.push({ type: 'finish', finishReason: 'error' })
  return { chunks, shouldNullSession: true }
}

/** Reads the token the agent's MCP connection to Pairdraw uses. */
async function readAutomationAuthToken(): Promise<string | null> {
  const { getAutomationAuthToken } = await import('@/app/automation/mcp/spawn')
  return getAutomationAuthToken()
}

export class ACPChatTransport implements ChatTransport<UIMessage> {
  private session: ACPSession | null = null
  private agentDef: ACPAgentDef
  private cwd: string
  /** Whether `cwd` is a project folder the person chose, where saved modes do not carry over. */
  private projectFolder: boolean
  private sentContext = false
  private destroying = false
  private readonly startupTimeoutMs: number | undefined
  private readonly automationAuthToken: () => Promise<string | null>
  /** The agent while it starts, before it becomes the session, so destroying can stop it. */
  private starting: AgentStreams | null = null
  /** Where the agent runs, which starts it and hands over its stdio. */
  private host: AgentHost

  /** The chat's document, where each reply's run records the edits the agent makes in it. */
  private store: EditorStore | null
  private onUsage: ((usage: AgentTurnUsage) => void) | null

  constructor(options: {
    agentDef: ACPAgentDef
    cwd?: string
    /** Whether `cwd` is a project folder the person chose for the chat. */
    projectFolder?: boolean
    store?: EditorStore
    /** Told each turn's tokens, which the Usage settings count with the chat's other models. */
    onUsage?: (usage: AgentTurnUsage) => void
    host?: AgentHost
    /** How long starting the agent may take; tests shorten it. */
    startupTimeoutMs?: number
    /** Pairdraw's automation token, which tests replace instead of running the MCP server. */
    automationAuthToken?: () => Promise<string | null>
  }) {
    this.agentDef = options.agentDef
    this.host = options.host ?? agentHost()
    this.cwd = options.cwd ?? '.'
    this.projectFolder = options.projectFolder ?? false
    this.store = options.store ?? null
    this.onUsage = options.onUsage ?? null
    this.startupTimeoutMs = options.startupTimeoutMs
    this.automationAuthToken = options.automationAuthToken ?? readAutomationAuthToken
  }

  async sendMessages({
    messages,
    abortSignal
  }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    const text =
      lastUserMessage?.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n') ?? ''

    if (this.session?.dead) {
      forgetChatAgent(this.session.chat)
      this.session = null
    }

    if (!this.session) {
      const started = await this.spawnAgent()
      // Destroyed between startup and here: the agent is still `starting`, so stop it.
      if (this.destroying) {
        started.endControls()
        await started.agent.close()
        throw new Error('The chat closed while its agent was starting.')
      }
      this.session = started
      // Its MCP session shows as this chat's agent, with this coding agent's logo.
      nameChatAgent(started.chat, `acp:${this.agentDef.id}`)
      this.starting = null
      this.sentContext = false
    }

    const carriesContext = !this.sentContext
    const promptText = carriesContext ? `${SYSTEM_PROMPT}\n\n${text}` : text
    this.sentContext = true

    const { connection, sessionId } = this.session
    const session = this.session

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        const mapper = createUpdateMapper(`turn-${Date.now()}`)
        let closed = false
        // The reply's run collects the edits the agent's calls make in the chat's document.
        const store = this.store
        const run = store ? startAgentRun(store, session.chat) : null

        function finish(reason: 'stop' | 'other' | 'error', errorText?: string) {
          if (closed) return
          closed = true
          if (store && run) endRun(store, run)
          if (errorText) controller.enqueue({ type: 'error', errorText })
          for (const chunk of mapper.end()) controller.enqueue(chunk)
          controller.enqueue({ type: 'finish-step' })
          controller.enqueue({ type: 'finish', finishReason: reason })
          session.onUpdate = null
          controller.close()
        }

        session.onUpdate = (params) => {
          if (closed) return
          for (const chunk of mapper.map(params.update)) controller.enqueue(chunk)
        }

        abortSignal?.addEventListener('abort', () => {
          void connection.cancel({ sessionId })
          finish('stop')
        })

        controller.enqueue({ type: 'start' })
        controller.enqueue({ type: 'start-step' })

        // Stopped while the agent started and reached its tools: the abort event already fired.
        if (abortSignal?.aborted) {
          // The instructions went out with nothing, so the next message carries them.
          if (carriesContext) this.sentContext = false
          finish('stop')
          return
        }

        connection
          .prompt({
            sessionId,
            prompt: [{ type: 'text', text: promptText }]
          })
          // The prompt answers once the agent's turn is over; nothing else ends the reply.
          .then((result) => {
            if (result.usage) this.onUsage?.(agentTurnUsage(result.usage, session.model))
            finish(result.stopReason === 'end_turn' ? 'stop' : 'other')
            return undefined
          })
          .catch((e) => {
            recordACPTransportFailure({
              operation: 'message',
              ...describeDiagnosticError(e)
            })
            finish('error', formatConnectionError(e, this.agentDef))
          })
      }
    })
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null
  }

  async destroy(): Promise<void> {
    this.destroying = true
    const starting = this.starting
    this.starting = null
    await starting?.close()
    if (this.session) {
      forgetAgentChat(this.session.chat)
      forgetChatAgent(this.session.chat)
      this.session.endControls()
      await this.session.agent.close()
      this.session = null
    }
  }

  private async spawnAgent(): Promise<ACPSession> {
    let agent: AgentStreams
    try {
      agent = await this.host.spawn(this.agentDef, {
        logId: this.agentDef.id,
        onExit: () => {
          if (!this.session) return
          this.session.endControls()
          // The agent is gone, so the chat id it was named with cannot name anything again.
          forgetChatAgent(this.session.chat)
          this.session.dead = true
          this.session = null
        }
      })
    } catch (e) {
      recordACPTransportFailure({ operation: 'start', ...describeDiagnosticError(e) })
      throw new Error(formatConnectionError(e, this.agentDef))
    }
    const stream = ndJsonStream(agent.input, agent.output)
    let onUpdate: ACPSession['onUpdate'] = null
    // Set once the session exists; the client reads it to record the model the agent names.
    let sessionRef: ACPSession | null = null
    const agentId = this.agentDef.id
    const { agentDef, store } = this

    const clientImpl: Client = {
      async requestPermission(
        params: RequestPermissionRequest
      ): Promise<RequestPermissionResponse> {
        const [{ requestPermissionFromUser }, { notifyPermissionWaiting }] = await Promise.all([
          import('@/app/ai/agents/acp/permission'),
          import('@/app/ai/chat/notifications')
        ])
        const title = params.toolCall.title ?? ''
        return requestPermissionFromUser(
          params,
          store ? () => notifyPermissionWaiting(store, agentDef.name, title) : undefined
        )
      },

      async sessionUpdate(params: SessionNotification): Promise<void> {
        // Claude's adapter names its model only in its usage updates.
        const { update } = params
        if (update.sessionUpdate === 'usage_update') {
          const meta = v.safeParse(usageMetaSchema, update._meta)
          if (meta.success && sessionRef) sessionRef.model = meta.output['_claude/model']
        }
        if (update.sessionUpdate === 'available_commands_update') {
          setAgentCommands(agentId, update.availableCommands)
        }
        noteAgentSessionUpdate(agentId, update)
        onUpdate?.(params)
      },

      extNotification: async (method, params) => {
        const status = parseAuthStatusUpdate(method, params)
        if (!status) return
        const { agentAccounts } = await import('@/app/ai/agents/setup/accounts')
        agentAccounts.report(this.agentDef.id, status)
      }
    }

    const connection = new ClientSideConnection((_agent: Agent) => clientImpl, stream)
    this.starting = agent
    // The SDK leaves requests pending when the agent exits, so each startup request races it.
    const stopped = connection.closed.then((): never => {
      throw new Error('The agent stopped while it was starting.')
    })
    stopped.catch(() => undefined)
    // Each startup request also gives up when the agent does not answer in time.
    const startupRequest = <T>(request: Promise<T>): Promise<T> =>
      raceStartup(request, stopped, this.startupTimeoutMs)
    let automationAuthToken: string | null
    try {
      automationAuthToken = await this.automationAuthToken()
    } catch (e) {
      await agent.close()
      throw startupError(e, this.agentDef)
    }

    try {
      await startupRequest(
        connection.initialize({
          protocolVersion: PROTOCOL_VERSION,
          clientCapabilities: {}
        })
      )
    } catch (e) {
      await agent.close()
      throw startupError(e, this.agentDef)
    }

    // The agent must reach Pairdraw's tools before it gets a prompt.
    let tools: Awaited<ReturnType<typeof linkOwnTools>>
    try {
      tools = await linkOwnTools(automationAuthToken)
    } catch (e) {
      // An outside MCP connection whose credential cannot be read fails here.
      await agent.close()
      throw startupError(e, this.agentDef)
    }
    onUpdate = ({ update }) => tools.noteUpdate(update)

    let sessionResult
    try {
      sessionResult = await startupRequest(
        connection.newSession({
          cwd: this.cwd,
          mcpServers: tools.mcpServers,
          _meta: tools.meta
        })
      )
    } catch (e) {
      tools.stop()
      await agent.close()
      throw startupError(e, this.agentDef)
    }

    let outcome: Awaited<ReturnType<typeof tools.outcome>>
    try {
      outcome = await startupRequest(tools.outcome())
    } catch (e) {
      tools.stop()
      throw startupError(e, this.agentDef)
    }
    // Destroyed while starting, as when the chat closes: the agent must not get a prompt.
    if (this.destroying) {
      await agent.close()
      throw new Error('The chat closed while its agent was starting.')
    }
    if (outcome.connected === false) {
      await agent.close()
      const error = toolsUnreachableError(this.agentDef, outcome.reason)
      recordACPTransportFailure({ operation: 'start', ...describeDiagnosticError(error) })
      throw error
    }
    onUpdate = null

    // The person's model, reasoning, and mode choices apply before the first prompt.
    const linking = startAgentSessionControls(
      agentId,
      sessionResult,
      sessionControlSetter(connection, sessionResult.sessionId),
      (controls) => {
        const model = sessionModel(controls)
        if (model && sessionRef) sessionRef.model = model
      },
      { projectFolder: this.projectFolder }
    )
    let endControls: () => void
    try {
      endControls = await startupRequest(linking)
    } catch (e) {
      // The agent stopped first; the link it would have made goes once it is made.
      void linking.then((end) => end()).catch(() => undefined)
      await agent.close()
      throw startupError(e, this.agentDef)
    }

    const session: ACPSession = {
      connection,
      sessionId: sessionResult.sessionId,
      chat: tools.chat,
      agent,
      dead: false,
      model:
        sessionModel(agentSessionControls(agentId)) ?? sessionResult.models?.currentModelId ?? null,
      endControls,
      get onUpdate() {
        return onUpdate
      },
      set onUpdate(fn) {
        onUpdate = fn
      }
    }

    sessionRef = session
    return session
  }
}
