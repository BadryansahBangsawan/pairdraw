import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { effectScope, ref } from 'vue'

import type { AIProviderID } from '@pairdraw/core/constants'

import { setModelConnectionAPIKey } from '@/app/ai/models/runtime'
import {
  isVertexClaudeDraft,
  savedBedrockAuthKind,
  savedVertexCredentialKind,
  useVertexCredentialKind,
  vertexNeedsProject
} from '@/app/ai/models/settings/profile-editor/platform'
import {
  createModelProfileDraft,
  modelSettingsSnapshot,
  replaceAIModelSettings
} from '@/app/ai/models/store'
import type { AIModelConnection, AIModelProfileDraft, AIModelSettings } from '@/app/ai/models/types'
import { serializeAWSCredentials } from '@/app/ai/providers/bedrock/credential'
import {
  bedrockBaseURL,
  bedrockConnectionBaseURL,
  DEFAULT_BEDROCK_REGION
} from '@/app/ai/providers/bedrock/endpoint'
import { vertexBaseURL } from '@/app/ai/providers/vertex/endpoint'

const VERTEX_PROJECT = vertexBaseURL({ project: 'design-team', location: 'global' })

function draft(overrides: Partial<AIModelProfileDraft>): AIModelProfileDraft {
  return { ...createModelProfileDraft(), ...overrides }
}

function settingsFixture(): AIModelSettings {
  const connection = (
    id: string,
    providerID: AIProviderID,
    customBaseURL: string
  ): AIModelConnection => ({
    id,
    providerID,
    customBaseURL,
    customAPIType: 'completions',
    credentialProfileId: id
  })
  return {
    version: 1,
    connections: [
      connection('connection-bedrock', 'amazon-bedrock', ''),
      connection('connection-vertex', 'google-vertex', VERTEX_PROJECT)
    ],
    models: [
      {
        id: 'model-bedrock',
        name: 'Bedrock',
        connectionId: 'connection-bedrock',
        modelID: 'anthropic.claude-sonnet-5-5',
        customModelID: '',
        maxOutputTokens: 16_384,
        thinkingLevel: 'default',
        capabilities: ['tools']
      }
    ],
    assignments: { design: 'model-bedrock', review: 'design', fast: null, vision: null }
  }
}

let original: AIModelSettings

beforeEach(() => {
  original = modelSettingsSnapshot()
  replaceAIModelSettings(settingsFixture())
})

afterEach(async () => {
  await setModelConnectionAPIKey('connection-bedrock', '')
  await setModelConnectionAPIKey('connection-vertex', '')
  replaceAIModelSettings(original)
})

describe('Vertex AI project requirement', () => {
  test('asks for a project only for Claude models without one', () => {
    const vertex = { providerID: 'google-vertex' as const }
    expect(vertexNeedsProject(draft({ ...vertex, modelID: 'claude-sonnet-5-5' }))).toBe(true)
    expect(
      vertexNeedsProject(
        draft({ ...vertex, modelID: 'claude-sonnet-5-5', customBaseURL: VERTEX_PROJECT })
      )
    ).toBe(false)
    expect(vertexNeedsProject(draft({ ...vertex, modelID: 'gemini-3.8-flash' }))).toBe(false)
    expect(
      vertexNeedsProject(
        draft({ ...vertex, modelID: 'gemini-3.8-flash', customModelID: 'claude-opus-4-8' })
      )
    ).toBe(true)
  })

  test('ignores other providers', () => {
    const anthropic = draft({ providerID: 'anthropic', modelID: 'claude-sonnet-5-5' })
    expect(vertexNeedsProject(anthropic)).toBe(false)
    expect(isVertexClaudeDraft(anthropic)).toBe(false)
  })
})

describe('saved Bedrock sign-in', () => {
  const bedrock = draft({ providerID: 'amazon-bedrock', modelID: 'anthropic.claude-sonnet-5-5' })

  test('is unknown for a provider other than Bedrock or a connection never saved', async () => {
    expect(await savedBedrockAuthKind(draft({ providerID: 'anthropic' }))).toBeNull()
    expect(
      await savedBedrockAuthKind({ ...bedrock, customBaseURL: bedrockBaseURL('eu-west-1') })
    ).toBeNull()
    expect(await savedBedrockAuthKind(bedrock)).toBeNull()
  })

  test('reopens on AWS access keys or a Bedrock API key, whichever was saved', async () => {
    await setModelConnectionAPIKey(
      'connection-bedrock',
      serializeAWSCredentials({ accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret' })
    )
    expect(await savedBedrockAuthKind(bedrock)).toBe('aws')

    await setModelConnectionAPIKey('connection-bedrock', 'ABSK-example')
    expect(await savedBedrockAuthKind(bedrock)).toBe('api-key')
  })
})

describe('Bedrock region storage', () => {
  test('keeps each region in one form, the default region as a new connection has it', () => {
    expect(bedrockConnectionBaseURL(DEFAULT_BEDROCK_REGION)).toBe('')
    expect(bedrockConnectionBaseURL('eu-west-1')).toBe(bedrockBaseURL('eu-west-1'))
    expect(bedrockConnectionBaseURL('evil.example.com/')).toBe('')
  })
})

describe('Vertex AI credential kind', () => {
  const vertex = draft({
    providerID: 'google-vertex',
    modelID: 'claude-sonnet-5-5',
    customBaseURL: VERTEX_PROJECT
  })

  test('reads the saved credential’s kind, never its value', async () => {
    expect(await savedVertexCredentialKind(vertex)).toBeNull()
    await setModelConnectionAPIKey('connection-vertex', 'AIza-example')
    expect(await savedVertexCredentialKind(vertex)).toBe('api-key')
    await setModelConnectionAPIKey('connection-vertex', 'ya29.example')
    expect(await savedVertexCredentialKind(vertex)).toBe('access-token')
  })

  test('prefers the credential being entered over the saved one', async () => {
    await setModelConnectionAPIKey('connection-vertex', 'AIza-example')
    const keyInput = ref('')
    const hasExistingKey = ref(true)
    const scope = effectScope()
    const kind = scope.run(() => useVertexCredentialKind(vertex, keyInput, hasExistingKey))
    // The saved credential is read asynchronously.
    const unread = () => kind?.value === ''
    for (let attempt = 0; attempt < 50 && unread(); attempt++) await Bun.sleep(1)

    expect(kind?.value).toBe('api-key')
    keyInput.value = 'Bearer ya29.replacement'
    expect(kind?.value).toBe('access-token')
    keyInput.value = ''
    hasExistingKey.value = false
    expect(kind?.value).toBe('')
    scope.stop()
  })
})
