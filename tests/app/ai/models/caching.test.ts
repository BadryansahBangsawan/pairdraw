import { describe, expect, test } from 'bun:test'

import { promptCachingOptions } from '@/app/ai/models/caching'

describe('prompt caching on cloud platforms', () => {
  test('asks Claude on Bedrock and Vertex AI to cache prompts, but not Gemini', () => {
    const cached = { anthropic: { cacheControl: { type: 'ephemeral' } } }
    expect(promptCachingOptions('amazon-bedrock', 'anthropic.claude-sonnet-5-5')).toEqual(cached)
    expect(promptCachingOptions('google-vertex', 'claude-sonnet-5-5')).toEqual(cached)
    expect(promptCachingOptions('google-vertex', 'gemini-3.8-flash')).toBeUndefined()
  })
})
