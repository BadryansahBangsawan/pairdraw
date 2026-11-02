import { afterEach, describe, expect, test } from 'bun:test'

import {
  listCatalogModels,
  resetModelsDevCatalogForTests,
  resolveModelsDevModel
} from '@/app/ai/models/catalog'

import { fetchStub } from '#tests/helpers/fetch'

function catalogResponse(body: unknown): typeof fetch {
  return fetchStub(async () => new Response(JSON.stringify(body), { status: 200 }))
}

afterEach(() => resetModelsDevCatalogForTests())

describe('models.dev catalog', () => {
  test('resolves provider model capabilities and output limits', async () => {
    const model = await resolveModelsDevModel(
      'anthropic',
      'claude-sonnet-4-6-20260301',
      catalogResponse({
        anthropic: {
          models: {
            'claude-sonnet-4-6': {
              name: 'Claude Sonnet 4.6',
              tool_call: true,
              attachment: true,
              limit: { output: 64_000 }
            }
          }
        }
      })
    )

    expect(model).toEqual({
      id: 'claude-sonnet-4-6-20260301',
      name: 'Claude Sonnet 4.6',
      capabilities: ['tools', 'vision'],
      recommendedMaxOutputTokens: 64_000,
      status: 'active'
    })
  })

  test('lists compatible models with curated recommendations first and latest models next', async () => {
    const models = await listCatalogModels(
      'openai',
      catalogResponse({
        openai: {
          models: {
            'gpt-6.1-sol': {
              name: 'GPT-6.1 Sol from catalog',
              tool_call: true,
              attachment: true,
              release_date: '2026-07-09',
              modalities: { output: ['text'] },
              limit: { output: 128_000 }
            },
            'gpt-6-preview': {
              name: 'GPT-6 Preview',
              tool_call: true,
              release_date: '2026-09-01',
              modalities: { output: ['text'] }
            },
            'gpt-image': {
              name: 'GPT Image',
              tool_call: false,
              release_date: '2026-09-02',
              modalities: { output: ['image'] }
            },
            missingOutput: { tool_call: true },
            malformedOutput: { tool_call: true, modalities: { output: 'text' } },
            imageOutput: { tool_call: true, modalities: { output: ['image'] } },
            legacy: {
              name: 'Legacy',
              tool_call: true,
              status: 'deprecated',
              release_date: '2025-01-01'
            }
          }
        }
      })
    )

    expect(models[0]).toMatchObject({
      id: 'gpt-6.1-sol',
      name: 'GPT-6.1 Sol',
      tag: 'Best',
      capabilities: ['tools', 'vision'],
      releaseDate: '2026-07-09'
    })
    expect(models.findIndex((model) => model.id === 'gpt-6-preview')).toBeGreaterThan(0)
    expect(models.some((model) => model.id === 'gpt-image')).toBeFalse()
    expect(models.some((model) => model.id === 'legacy')).toBeFalse()
    for (const id of ['missingOutput', 'malformedOutput', 'imageOutput']) {
      expect(models.some((model) => model.id === id)).toBeFalse()
    }
  })

  test('falls back to curated models when the catalog request fails', async () => {
    const failingFetch = fetchStub(async () => new Response(null, { status: 503 }))
    const models = await listCatalogModels('anthropic', failingFetch)

    expect(models[0]).toMatchObject({ id: 'claude-sonnet-5-5', tag: 'Best for design' })
  })

  test('falls back to curated models when the catalog has a malformed entry', async () => {
    const failingFetch = fetchStub(async () => new Response(null, { status: 503 }))
    const models = await listCatalogModels(
      'anthropic',
      catalogResponse({ anthropic: { models: { 'claude-sonnet-5': null } } })
    )

    expect(models).toEqual(await listCatalogModels('anthropic', failingFetch))
  })

  test('retries a failed shared request and shares a successful request', async () => {
    const originalFetch = globalThis.fetch
    let requests = 0
    globalThis.fetch = fetchStub(async () => {
      requests++
      if (requests === 1) return new Response(null, { status: 503 })
      return new Response(
        JSON.stringify({
          openai: { models: { retryModel: { name: 'Retry model', tool_call: true } } }
        })
      )
    })
    try {
      expect(await resolveModelsDevModel('openai', 'retryModel')).toBeNull()
      const [first, second] = await Promise.all([
        resolveModelsDevModel('openai', 'retryModel'),
        resolveModelsDevModel('openai', 'retryModel')
      ])
      expect(first?.name).toBe('Retry model')
      expect(second).toEqual(first)
      expect(requests).toBe(2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('preserves vision support in offline curated models', async () => {
    const failingFetch = fetchStub(async () => new Response(null, { status: 503 }))
    const openai = await listCatalogModels('openai', failingFetch)
    for (const id of ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-luna']) {
      expect(openai.find((model) => model.id === id)?.capabilities).toContain('vision')
    }
    const zai = await listCatalogModels('zai', failingFetch)
    expect(zai.find((model) => model.id === 'glm-5v-turbo')?.capabilities).toContain('vision')
  })

  test('lists only the models an OpenCode preset reaches through chat completions', async () => {
    const opencode = {
      models: {
        'kimi-k3': { name: 'Kimi K3', tool_call: true, modalities: { output: ['text'] } },
        'glm-5.3': {
          name: 'GLM-5.3',
          tool_call: true,
          modalities: { output: ['text'] },
          provider: { npm: '@ai-sdk/openai-compatible' }
        },
        'claude-sonnet-5-5': {
          name: 'Claude Sonnet 5.5',
          tool_call: true,
          modalities: { output: ['text'] },
          provider: { npm: '@ai-sdk/anthropic', api: 'https://opencode.ai/inference/anthropic/v1' }
        },
        'gpt-6.1-sol': {
          name: 'GPT-6.1 Sol',
          tool_call: true,
          modalities: { output: ['text'] },
          provider: { npm: '@ai-sdk/openai' }
        }
      }
    }
    const ids = (await listCatalogModels('opencode-zen', catalogResponse({ opencode }))).map(
      (model) => model.id
    )
    expect(ids).toContain('kimi-k3')
    expect(ids).toContain('glm-5.3')
    expect(ids).not.toContain('claude-sonnet-5-5')
    expect(ids).not.toContain('gpt-6.1-sol')
    expect(
      await resolveModelsDevModel(
        'opencode-zen',
        'claude-sonnet-5-5',
        catalogResponse({ opencode })
      )
    ).toBeNull()
  })

  test('reads each preset from its models.dev provider', async () => {
    const model = { name: 'Grok 4.7', tool_call: true, attachment: true }
    expect(
      await resolveModelsDevModel(
        'xai',
        'grok-4.7',
        catalogResponse({ xai: { models: { 'grok-4.7': model } } })
      )
    ).toMatchObject({ id: 'grok-4.7', capabilities: ['tools', 'vision'] })
    expect(
      await resolveModelsDevModel(
        'kimi-for-coding',
        'k3.1-pro',
        catalogResponse({ 'kimi-code-plan-global': { models: { 'k3.1-pro': model } } })
      )
    ).toMatchObject({ id: 'k3.1-pro' })
  })

  test('returns null when the provider or model is unknown', async () => {
    expect(
      await resolveModelsDevModel('openai-compatible', 'local', catalogResponse({}))
    ).toBeNull()
  })
})
