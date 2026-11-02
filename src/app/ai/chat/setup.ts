import { uniqBy } from 'es-toolkit'
import { toValue, type MaybeRefOrGetter } from 'vue'

import { agentAutoConnect, type AgentAutoConnect } from '@/app/ai/agents/auto/session'
import { isConfigured } from '@/app/ai/chat/storage'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import { runAISetup } from '@/app/ai/models/settings/onboarding/dialog'

export interface ChatSetupGateOptions {
  /** Whether the chat has a model it can send to. */
  isConfigured: MaybeRefOrGetter<boolean>
  /** Looks for a coding agent on this computer first. */
  autoConnect: Pick<AgentAutoConnect, 'detect'>
  /** Guided setup, resolving once it closes, finished or not. */
  runSetup: () => Promise<void>
}

/**
 * Whether the chat can send, setting it up first when it cannot: a coding agent on this
 * computer, and guided setup when there is none. The chat can send once that finished with a
 * model it can use; dismissing setup leaves the chat as it was.
 */
export function createChatSetupGate({
  isConfigured: configured,
  autoConnect,
  runSetup
}: ChatSetupGateOptions) {
  return async function ensureChatConfigured(): Promise<boolean> {
    if (toValue(configured)) return true
    const outcome = await autoConnect.detect()
    if (toValue(configured)) return true
    // An agent that waits for a click finishes in the chat column, which keeps the prompt.
    if (outcome === 'action') return true
    // Nothing to use here, or an agent that still left the chat unable to send.
    await runSetup()
    return toValue(configured)
  }
}

/**
 * A message written while a prompt already waits for setup, joined to it so neither is lost:
 * both go as one message once the chat can send.
 */
export function joinWaitingPrompt(
  waiting: ChatSubmission | null,
  next: ChatSubmission
): ChatSubmission {
  if (!waiting) return next
  return {
    modelText: `${waiting.modelText}\n\n${next.modelText}`,
    displayText: `${waiting.displayText}\n\n${next.displayText}`,
    images: [...waiting.images, ...next.images],
    nodes: uniqBy([...waiting.nodes, ...next.nodes], (node) => node.id),
    files: [...(waiting.files ?? []), ...(next.files ?? [])]
  }
}

/**
 * Whether the chat can send; a prompt written while it cannot waits for the agent auto-connect
 * found, or for guided setup when it found none.
 */
export const ensureChatConfigured = createChatSetupGate({
  isConfigured,
  autoConnect: agentAutoConnect,
  runSetup: runAISetup
})
