import { computed, type Ref } from 'vue'

import { agentAutoConnect } from '@/app/ai/agents/auto/session'
import { agentSignInHelp } from '@/app/ai/agents/signed-out'
import type { AIChatFailure } from '@/app/ai/chat/failure'

/**
 * The coding agent notices the chat column shows: the one auto-connect switched to on its own,
 * the one it set the chat up with, and that agent when it refused the last message for want of a
 * sign-in of its own, with what it needs.
 */
export function useAgentNotices(providerID: Ref<string>, chatFailure: Ref<AIChatFailure | null>) {
  /** The coding agent the chat switched to on its own, while it is still the chat's model. */
  const autoAgent = computed(() => {
    const agent = agentAutoConnect.state.notice
    return agent && providerID.value === `acp:${agent.id}` ? agent : null
  })
  /**
   * The coding agent auto-connect set the chat up with, on its own or on a click, while it is still
   * the chat's model.
   */
  const connectedAgent = computed(() => {
    const { phase, candidate } = agentAutoConnect.state
    if (phase !== 'connected' || !candidate) return null
    return providerID.value === `acp:${candidate.agent.id}` ? candidate.agent : null
  })
  /**
   * That agent, when it refused the last message for want of a sign-in of its own. An agent that
   * does not report its login is switched on without a click, so this is where that shows: in the
   * chat column, with what it needs, instead of a notice that leads elsewhere.
   */
  const signedOutAgent = computed(() => {
    const reason = chatFailure.value?.reason
    return reason === 'sign-in-expired' ||
      reason === 'agent-unconfigured' ||
      reason === 'authentication'
      ? connectedAgent.value
      : null
  })
  /** How to sign in to that agent, or what else it needs where it has no sign-in of its own. */
  const signedOutHelp = computed(() =>
    signedOutAgent.value ? agentSignInHelp(signedOutAgent.value) : null
  )
  return { autoAgent, connectedAgent, signedOutAgent, signedOutHelp }
}
