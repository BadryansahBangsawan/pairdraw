import { afterEach, describe, expect, test } from 'bun:test'

import { resetModelsDevCatalogForTests, resolveModelContextWindow } from '@/app/ai/models/catalog'

import { fetchStub } from '#tests/helpers/fetch'

function catalogResponse(body: unknown): typeof fetch {
  return fetchStub(async () => new Response(JSON.stringify(body), { status: 200 }))
}

afterEach(() => resetModelsDevCatalogForTests())

describe('model context window', () => {
  test('reads the window models.dev lists, under the IDs a provider uses', async () => {
    const fetcher = catalogResponse({
      anthropic: {
        models: {
          'claude-sonnet-4-6': { name: 'Claude Sonnet 4.6', limit: { context: 200_000 } },
          'claude-unlisted': { name: 'Unlisted', limit: { context: 'lots' } }
        }
      }
    })
    expect(
      await resolveModelContextWindow('anthropic', 'claude-sonnet-4-6-20260301', fetcher)
    ).toBe(200_000)
    expect(await resolveModelContextWindow('anthropic', 'claude-unlisted', fetcher)).toBeNull()
    expect(await resolveModelContextWindow('anthropic', 'missing', fetcher)).toBeNull()
  })

  test('is unknown for a provider without a catalog', async () => {
    expect(await resolveModelContextWindow('openai-compatible', 'local-model')).toBeNull()
  })
})
