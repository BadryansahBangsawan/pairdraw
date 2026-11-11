import type { ACPAgentDef } from '@open-pencil/core/constants'

import { refreshAIProviderStatus } from '@/app/ai/chat/storage'
import { applyOnboardingPlan } from '@/app/ai/models/settings/onboarding/apply'
import { currentOnboardingModels } from '@/app/ai/models/settings/onboarding/current'
import { planOnboarding } from '@/app/ai/models/settings/onboarding/plan'
import { modelSettingsSnapshot, replaceAIModelSettings } from '@/app/ai/models/store'
import type { AIModelProfile, AIModelSettings } from '@/app/ai/models/types'
import { updateAISetupState } from '@/app/settings/preferences/store'

function providerOf(settings: AIModelSettings, profile: AIModelProfile | undefined) {
  return settings.connections.find((connection) => connection.id === profile?.connectionId)
    ?.providerID
}

/** A profile the chat can already use for the agent: on its connection, able to use tools. */
function agentProfile(settings: AIModelSettings, agent: ACPAgentDef): AIModelProfile | undefined {
  return settings.models.find(
    (profile) =>
      profile.capabilities.includes('tools') && providerOf(settings, profile) === `acp:${agent.id}`
  )
}

/** Whether the settings' design model runs on `agent`. */
function designsWithAgent(settings: AIModelSettings, agent: ACPAgentDef): boolean {
  const design = settings.models.find((profile) => profile.id === settings.assignments.design)
  return (
    Boolean(design?.capabilities.includes('tools')) &&
    providerOf(settings, design) === `acp:${agent.id}`
  )
}

/**
 * The model settings with `agent` as the chat's design model. A profile the agent already has is
 * assigned as it is, the way choosing it in Settings does; otherwise setup's plan for the agent
 * adds its connection and profile, clears the roles an agent cannot take, and drops the empty
 * profile a fresh install starts with. The design model it replaces stays among the profiles.
 */
function agentActivationSettings(
  settings: AIModelSettings,
  agent: ACPAgentDef,
  createId: () => string
): AIModelSettings {
  const existing = agentProfile(settings, agent)
  if (existing) {
    const next = structuredClone(settings)
    next.assignments.design = existing.id
    return next
  }
  // The agent takes the design role even from a model setup would otherwise keep, such as a
  // Cloud one: only a fresh install or the person's click activates an agent.
  const current = { ...currentOnboardingModels(settings), design: null }
  const plan = planOnboarding(
    { goals: ['design'], access: [`acp:${agent.id}`], spending: 'existing' },
    { agentsAvailable: true, current }
  )
  return applyOnboardingPlan({ settings, plan, details: {}, createId }).settings
}

/**
 * Makes `agent` the chat's provider without asking, as auto-connect does once it is ready.
 * Fails, changing nothing, when the agent would not end up as the chat's design model.
 */
export async function activateAgent(agent: ACPAgentDef): Promise<void> {
  // A plain copy: the reactive settings cannot be structured-cloned.
  const next = agentActivationSettings(modelSettingsSnapshot(), agent, () => crypto.randomUUID())
  if (!designsWithAgent(next, agent)) {
    throw new Error(`${agent.name} could not become the chat’s model.`)
  }
  replaceAIModelSettings(next)
  updateAISetupState('done')
  await refreshAIProviderStatus()
}
