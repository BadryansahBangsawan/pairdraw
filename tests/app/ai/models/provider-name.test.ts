import { describe, expect, test } from 'bun:test'

import { HARNESS_PROVIDER_ID } from '@open-pencil/core/constants'

import { modelProviderName } from '@/app/ai/models/provider-name'
import { OPENPENCIL_AI_PROVIDER } from '@/app/ai/providers/openpencil/provider'
import { APP_NAME } from '@/constants'

describe('model provider name', () => {
  test("names Cloud's AI service after the app", () => {
    expect(modelProviderName(OPENPENCIL_AI_PROVIDER)).toBe(`${APP_NAME} Cloud`)
  })

  test('names providers, coding agents, and the Pi harness', () => {
    expect(modelProviderName('openrouter')).toBe('OpenRouter')
    expect(modelProviderName('acp:codex')).toBe('Codex')
    expect(modelProviderName(HARNESS_PROVIDER_ID)).toBe('Pi')
  })

  test('falls back to the ID it does not know', () => {
    expect(modelProviderName('acp:unknown')).toBe('acp:unknown')
    expect(modelProviderName('unknown')).toBe('unknown')
  })
})
