import { useI18n } from '@pairdraw/vue/i18n'

import type { SetupProblem } from '@/app/ai/agents/setup/view'

/**
 * The warning setup shows for a problem it cannot fix on its own. `agent` names the coding agent
 * for problems that are about one; without it, `install-needed` has no message.
 */
export function useSetupProblemMessage() {
  const { ai } = useI18n()
  return (problem: SetupProblem | null, agent?: string): string | null => {
    if (problem === 'needs-npm') return ai.value.aiSetupAgentNeedsNpm
    if (problem === 'needs-admin') return ai.value.aiSetupAgentNeedsAdmin
    if (problem === 'install-failed') return ai.value.aiSetupAgentInstallFailed
    if (problem === 'mcp-start-failed') return ai.value.aiSetupAgentMCPStartFailed
    if (problem === 'lookup-failed') return ai.value.aiSetupAgentLookupFailed
    if (problem === 'install-needed' && agent)
      return ai.value.aiSetupProblemInstallNeeded({ agent })
    return null
  }
}
