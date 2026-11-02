import type { ConversationMeta } from './types'

/** What runs a chat: the built-in tool loop, or a coding agent through ACP or the Pi harness. */
export type ChatBackend = ConversationMeta['backend']

/** The backend a provider's chats run on. */
export function providerBackend(providerID: string): ChatBackend {
  if (providerID.startsWith('acp:')) return 'acp'
  return providerID === 'harness:pi' ? 'harness' : 'direct'
}

/** One side of a switch of the chat's model: the profile, or agent, and what it runs on. */
export interface ChatModelChoice {
  /** The model profile, or the agent a computer's agent would get a profile for. */
  id: string
  backend: ChatBackend
}

/**
 * What switching the chat's model now leaves behind. A coding agent starts from its own session,
 * so it never sees the messages so far (`transcript`). A built-in model reads the whole transcript
 * with every request, so the messages carry over to it; leaving an agent for one only drops what
 * the agent's session held, such as its file reads and tool results (`agentSession`). Nothing is
 * lost before the first message.
 */
export type ContextLoss = 'none' | 'transcript' | 'agentSession'

export function switchContextLoss(
  hasMessages: boolean,
  from: ChatModelChoice | null,
  to: ChatModelChoice
): ContextLoss {
  if (!hasMessages || !from || from.id === to.id) return 'none'
  if (to.backend !== 'direct') return 'transcript'
  return from.backend === 'direct' ? 'none' : 'agentSession'
}
