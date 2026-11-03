import { describe, expect, test } from 'bun:test'

import { resolveLanguageModelID } from '@/app/ai/models/language-model'

describe('resolveLanguageModelID on cloud platforms', () => {
  test('uses a custom model ID in place of the listed one', () => {
    for (const providerID of ['amazon-bedrock', 'google-vertex'] as const) {
      expect(
        resolveLanguageModelID({ providerID, modelID: 'listed', customModelID: ' custom ' })
      ).toBe('custom')
    }
  })
})
