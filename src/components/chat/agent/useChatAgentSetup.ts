import { computed, ref, watch, type Ref } from 'vue'

import type { ACPAgentID } from '@open-pencil/core/constants'

import { agentAutoConnect, type AutoConnectPhase } from '@/app/ai/agents/auto/session'
import { agentHostAvailable } from '@/app/ai/agents/host/current'
import { useAgentSetup } from '@/app/ai/agents/setup/use'
import type { AgentSetupState } from '@/app/ai/agents/setup/view'
import { hasPendingPrompt } from '@/app/ai/chat/pending-prompt'
import { credentialsReady, isConfigured } from '@/app/ai/chat/storage'
import { isUnconfiguredModelSettings } from '@/app/ai/models/settings/onboarding/apply'
import { openAISetup } from '@/app/ai/models/settings/onboarding/dialog'
import { aiModelSettings } from '@/app/ai/models/store'
import type { EditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'

/**
 * The chat column's side of auto-connect while the chat cannot send: what the setup card shows,
 * and what its buttons do. It looks for agents once the card shows, again when a companion pairs
 * while it shows, and never before the saved credentials say the chat really cannot send.
 *
 * Only a fresh install's settings can be set up from the card. For a model the person chose that
 * cannot send now, such as one whose key is locked, the lookup runs quietly, for the agents the
 * model picker offers, and the card shows setup from the start.
 */
export function useChatAgentSetup(store: Readonly<Ref<EditorStore | undefined>>) {
  const setups = useAgentSetup()
  const state = agentAutoConnect.state
  const untouched = computed(() => isUnconfiguredModelSettings(aiModelSettings.value))
  const looking = ref(false)
  const looked = ref(false)
  let shown = false

  async function look(): Promise<void> {
    shown = true
    looking.value = untouched.value
    try {
      await credentialsReady
      if (!isConfigured.value) await agentAutoConnect.detect()
    } finally {
      looking.value = false
      looked.value = true
    }
  }

  // A tab that pairs with its companion while the card shows can run agents now.
  watch(agentHostAvailable, (available) => {
    if (available && shown && !isConfigured.value) void look()
  })

  const phase = computed((): AutoConnectPhase => {
    const current = state.phase
    // A lookup for a model the person chose can switch nothing on, so it shows nothing.
    if (current === 'detecting') return untouched.value ? 'detecting' : 'idle'
    // `idle` has not looked yet, or left a model the person chose alone; `connected` with a chat
    // that cannot send looks again.
    if (current !== 'idle' && current !== 'connected') return current
    if (!agentHostAvailable()) return 'unsupported'
    // A fresh install looks as soon as the card shows, so the card says so from the start.
    return looking.value || (untouched.value && !looked.value) ? 'detecting' : 'idle'
  })

  const setup = computed((): AgentSetupState | null => {
    const candidate = state.candidate
    if (!candidate) return null
    return {
      ...setups.agentSetup(`acp:${candidate.agent.id}`),
      connection: agentAutoConnect.connection(candidate.agent.id)
    }
  })

  const waiting = computed(() => store.value !== undefined && hasPendingPrompt(store.value))

  /** Acts on the agent the card offers, if it still offers one. */
  function withCandidate(run: (id: ACPAgentID) => void) {
    const candidate = state.candidate
    if (candidate) run(candidate.agent.id)
  }

  return {
    phase,
    candidate: computed(() => state.candidate),
    setup,
    waiting,
    look,
    connect: ({ installs }: { installs: boolean }) =>
      withCandidate((id) => void agentAutoConnect.connect(id, { installs })),
    cancelSignIn: () => withCandidate((id) => void agentAutoConnect.cancelSignIn(id)),
    submitSignInCode: (code: string) =>
      withCandidate((id) => void agentAutoConnect.submitSignInCode(id, code)),
    setUp: () => openAISetup(),
    openSettings: () => openSettingsDialog('ai')
  }
}
