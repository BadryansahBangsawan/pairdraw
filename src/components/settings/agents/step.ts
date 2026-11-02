import type { ACPAgentDef } from '@open-pencil/core/constants'
import { useI18n } from '@open-pencil/vue/i18n'

import type { AgentConnectStep } from '@/app/ai/agents/setup/connect'

/** What each step of connecting a coding agent is called, naming the agent where it acts on it. */
export function useConnectStepLabel() {
  const { ai } = useI18n()
  return (step: AgentConnectStep, agent: ACPAgentDef): string => {
    if (step === 'detect') return ai.value.aiSetupConnectStepDetect
    if (step === 'install') return ai.value.aiSetupConnectStepInstall({ agent: agent.name })
    if (step === 'sign-in') return ai.value.aiSetupConnectStepSignIn({ agent: agent.name })
    if (step === 'tools') return ai.value.aiSetupConnectStepTools
    return ai.value.aiSetupConnectStepActivate
  }
}
