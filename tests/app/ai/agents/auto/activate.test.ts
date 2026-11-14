import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { ACP_AGENTS } from '@pairdraw/core/constants'

import { activateAgent } from '@/app/ai/agents/auto/activate'
import {
  aiModelSettings,
  modelSettingsSnapshot,
  replaceAIModelSettings,
  resolveAIModelRole,
  type AIModelSettings
} from '@/app/ai/models'
import { isUnconfiguredModelSettings } from '@/app/ai/models/settings/onboarding/apply'
import { appPreferences, updateAISetupState } from '@/app/settings/preferences/store'

import { expectDefined } from '#tests/helpers/assert'

const claude = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'claude-code'),
  'Claude Code'
)

function freshInstall(): AIModelSettings {
  return {
    version: 1,
    connections: [
      {
        id: 'connection-default',
        providerID: 'openai-compatible',
        customBaseURL: '',
        customAPIType: 'completions',
        credentialProfileId: 'default'
      }
    ],
    models: [
      {
        id: 'model-default',
        name: 'Design model',
        connectionId: 'connection-default',
        modelID: '',
        customModelID: '',
        maxOutputTokens: 16_384,
        thinkingLevel: 'default',
        capabilities: ['tools']
      }
    ],
    assignments: { design: 'model-default', review: 'design', fast: 'design', vision: null }
  }
}

/** Settings with an API model in the chat and a Claude Code profile set aside. */
function withAgentProfile(): AIModelSettings {
  return {
    version: 1,
    connections: [
      {
        id: 'connection-anthropic',
        providerID: 'anthropic',
        customBaseURL: '',
        customAPIType: 'completions',
        credentialProfileId: 'connection-anthropic'
      },
      {
        id: 'connection-claude',
        providerID: 'acp:claude-code',
        customBaseURL: '',
        customAPIType: 'completions',
        credentialProfileId: 'connection-claude'
      }
    ],
    models: [
      {
        id: 'model-opus',
        name: 'Claude Opus',
        connectionId: 'connection-anthropic',
        modelID: 'claude-opus-5',
        customModelID: '',
        maxOutputTokens: 32_000,
        thinkingLevel: 'default',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'model-claude-code',
        name: 'Claude Code',
        connectionId: 'connection-claude',
        modelID: '',
        customModelID: '',
        maxOutputTokens: 16_384,
        thinkingLevel: 'default',
        capabilities: ['tools']
      }
    ],
    assignments: { design: 'model-opus', review: null, fast: null, vision: null }
  }
}

const savedSettings = modelSettingsSnapshot()
const savedPreferences = structuredClone(toRaw(appPreferences.value))

beforeEach(() => updateAISetupState('pending'))
afterEach(() => {
  replaceAIModelSettings(savedSettings)
  appPreferences.value = structuredClone(savedPreferences)
})

describe('switching the chat to a coding agent', () => {
  test('replaces a fresh install’s empty model with the agent', async () => {
    replaceAIModelSettings(freshInstall())

    await activateAgent(claude)

    const design = expectDefined(resolveAIModelRole('design'), 'design model')
    expect(design.connection.providerID).toBe('acp:claude-code')
    expect(toRaw(design.profile)).toMatchObject({ modelID: '', capabilities: ['tools'] })
    for (const role of ['review', 'fast', 'vision'] as const) {
      expect(aiModelSettings.value.assignments[role]).toBeNull()
    }
    expect(aiModelSettings.value.models).toHaveLength(1)
    expect(aiModelSettings.value.connections.map((connection) => connection.providerID)).toEqual([
      'acp:claude-code'
    ])
    expect(isUnconfiguredModelSettings(aiModelSettings.value)).toBe(false)
    expect(appPreferences.value.onboarding.aiSetup).toBe('done')
  })

  test('reuses a profile the agent already has', async () => {
    replaceAIModelSettings(withAgentProfile())

    await activateAgent(claude)

    expect(aiModelSettings.value.assignments.design).toBe('model-claude-code')
    expect(aiModelSettings.value.models.map((profile) => profile.id)).toEqual([
      'model-opus',
      'model-claude-code'
    ])
    expect(aiModelSettings.value.connections).toHaveLength(2)
  })

  test('takes the chat from a model setup would otherwise keep, which stays a profile', async () => {
    // A proxy without its address: setup keeps such models, and the chat cannot send to it.
    const settings = withAgentProfile()
    settings.connections = [
      { ...settings.connections[0], id: 'connection-proxy', providerID: 'anthropic-compatible' }
    ]
    settings.models = [{ ...settings.models[0], connectionId: 'connection-proxy' }]
    replaceAIModelSettings(settings)

    await activateAgent(claude)

    const design = expectDefined(resolveAIModelRole('design'), 'design model')
    expect(design.connection.providerID).toBe('acp:claude-code')
    expect(aiModelSettings.value.models.map((profile) => profile.id)).toContain('model-opus')
    expect(appPreferences.value.onboarding.aiSetup).toBe('done')
  })
})
