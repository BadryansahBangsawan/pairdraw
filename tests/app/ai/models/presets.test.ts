import { describe, expect, test } from 'bun:test'

import type { LanguageModel } from 'ai'

import { AI_PROVIDERS } from '@open-pencil/core/constants'
import type { AIProviderID } from '@open-pencil/core/constants'

import { resolveProviderModel } from '@/app/ai/models/reasoning/floors'
import { reasoningCallSettings } from '@/app/ai/models/reasoning/settings'
import { ONBOARDING_MORE_API_PROVIDERS } from '@/app/ai/models/settings/onboarding/plan'
import { modelProviderAdapter } from '@/app/ai/providers/registry'
import type { FetchFunction } from '@/app/http/types'

type SentRequest = { url: string; headers: Headers; body: unknown }

function languageModelInstance(model: LanguageModel): Exclude<LanguageModel, string> {
  if (typeof model === 'string') throw new Error(`Expected a model instance, got ${model}`)
  return model
}

/** The request a preset's model sends for one prompt, stopped before it leaves. */
async function sentRequest(
  providerID: AIProviderID,
  modelID: string,
  level: 'default' | 'off' = 'default'
): Promise<SentRequest> {
  // A field, so the write inside the fetch is visible to the check after the request.
  const captured: { request: SentRequest | null } = { request: null }
  const fetchSpy: FetchFunction = async (input, init) => {
    const body: unknown = JSON.parse(String(init?.body))
    captured.request = { url: String(input), headers: new Headers(init?.headers), body }
    throw new Error('stop')
  }
  const model = languageModelInstance(
    modelProviderAdapter(providerID).create(
      {
        providerID,
        apiKey: 'test-key',
        modelID,
        customModelID: '',
        customBaseURL: '',
        customAPIType: 'completions'
      },
      { fetch: fetchSpy }
    )
  )
  const known = await resolveProviderModel(providerID, modelID)
  await Promise.resolve(
    model.doGenerate({
      ...reasoningCallSettings(providerID, level, known?.minReasoningEffort),
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]
    })
  ).catch(() => undefined)
  if (!captured.request) throw new Error(`${providerID} sent no request`)
  return captured.request
}

const PRESET_ENDPOINTS = [
  ['xai', 'https://api.x.ai/v1'],
  ['meta', 'https://api.meta.ai/v1'],
  ['kimi-for-coding', 'https://api.kimi.ai/coding/v1'],
  ['moonshot', 'https://api.moonshot.ai/v1'],
  ['together', 'https://api.together.xyz/v1'],
  ['fireworks', 'https://api.fireworks.ai/inference/v1'],
  ['opencode-zen', 'https://opencode.ai/inference/openai/v1'],
  ['opencode-go', 'https://opencode.ai/inference/go/openai/v1']
] as const satisfies readonly (readonly [AIProviderID, string])[]

function preset(providerID: AIProviderID) {
  const definition = AI_PROVIDERS.find(({ id }) => id === providerID)
  if (!definition) throw new Error(`No preset for ${providerID}`)
  return definition
}

describe('provider presets', () => {
  test.each(PRESET_ENDPOINTS)(
    '%s sends its default model to its chat completions endpoint',
    async (providerID, baseURL) => {
      const definition = preset(providerID)
      const sent = await sentRequest(providerID, definition.defaultModel)
      expect(sent.url).toBe(`${baseURL}/chat/completions`)
      expect(sent.headers.get('authorization')).toBe('Bearer test-key')
      expect(sent.body).toMatchObject({ model: definition.defaultModel })
    }
  )

  test.each(PRESET_ENDPOINTS)(
    '%s recommends a default model that can run the design agent',
    (providerID) => {
      const definition = preset(providerID)
      const recommended = definition.models.find(({ id }) => id === definition.defaultModel)
      expect(recommended?.capabilities).toContain('tools')
      expect(definition.keyURL).toStartWith('https://')
      // Guided setup offers each one behind "More providers".
      expect(ONBOARDING_MORE_API_PROVIDERS).toContain(providerID)
    }
  )

  test('raises Off to the lowest effort an always-reasoning model accepts', async () => {
    expect((await sentRequest('xai', 'grok-4.7', 'off')).body).toMatchObject({
      reasoning_effort: 'low'
    })
    expect((await sentRequest('meta', 'muse-spark-1.3', 'off')).body).toMatchObject({
      reasoning_effort: 'minimal'
    })
  })

  test.each(['opencode-zen', 'opencode-go'] as const)(
    '%s names a session for each model and identifies the app',
    async (providerID) => {
      const first = await sentRequest(providerID, preset(providerID).defaultModel)
      const second = await sentRequest(providerID, preset(providerID).defaultModel)
      const session = first.headers.get('x-opencode-session')
      expect(session).toMatch(/^[0-9a-f]{32}$/)
      expect(second.headers.get('x-opencode-session')).not.toBe(session)
      expect(first.headers.get('user-agent')).toStartWith('Pairdraw/')
    }
  )

  test('sends no OpenCode session to other providers', async () => {
    const sent = await sentRequest('together', preset('together').defaultModel)
    expect(sent.headers.has('x-opencode-session')).toBe(false)
  })
})
