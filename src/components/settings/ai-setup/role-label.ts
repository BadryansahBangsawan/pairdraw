import { useI18n } from '@pairdraw/vue/i18n'

import { modelProviderName } from '@/app/ai/models/provider-name'
import { isOnboardingAgent, type PlannedRole } from '@/app/ai/models/settings/onboarding/plan'
import { useModelRoleLabels } from '@/components/settings/models/role-labels'

/** Labels for the roles and the choices guided setup offers for them. */
export function useRoleLabels() {
  const { ai } = useI18n()
  const roleLabel = useModelRoleLabels()

  function choiceLabel(choice: PlannedRole): string {
    if (choice === 'design') return ai.value.modelRoleUseDesign
    if (choice === null) return ai.value.noModel
    const provider = modelProviderName(choice.providerID)
    if (isOnboardingAgent(choice.providerID)) return `${provider} · ${ai.value.aiSetupAgentModel}`
    const name = choice.name || ai.value.designModelName
    return choice.modelID && name !== provider ? `${name} · ${provider}` : provider
  }

  return { choiceLabel, roleLabel }
}
