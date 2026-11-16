import { afterEach, describe, expect, test } from 'bun:test'

import { ACP_AGENTS, AI_PROVIDERS, HARNESS_PROVIDER_ID } from '@pairdraw/core/constants'

import { modelSettingsSnapshot, replaceAIModelSettings, type AIModelProfile } from '@/app/ai/models'
import { modelVendorLogo, profileLogoSource, providerLogo } from '@/app/ai/models/provider-logo'
import { ONBOARDING_SERVER_PRESETS } from '@/app/ai/models/settings/onboarding/connections'
import { PAIRDRAW_AI_PROVIDER } from '@/app/ai/providers/pairdraw/provider'

/** Providers that are any server speaking a vendor's API, with no brand of their own. */
const GENERIC_ENDPOINTS = new Set(['openai-compatible', 'anthropic-compatible'])

describe('provider logo', () => {
  test('gives every branded provider, coding agent, and server preset a logo', () => {
    const ids = [
      ...AI_PROVIDERS.map((provider) => provider.id).filter((id) => !GENERIC_ENDPOINTS.has(id)),
      ...ACP_AGENTS.map((agent) => `acp:${agent.id}`),
      ...ONBOARDING_SERVER_PRESETS.map((preset) => preset.id)
    ]
    for (const id of ids) expect({ id, logo: providerLogo(id) }).not.toEqual({ id, logo: null })
  })

  test('names the brand behind each provider and agent', () => {
    expect(providerLogo('anthropic')).toBe('anthropic')
    expect(providerLogo('chatgpt')).toBe('openai')
    expect(providerLogo('kimi-for-coding')).toBe('kimi')
    expect(providerLogo('opencode-go')).toBe('opencode')
    expect(providerLogo('acp:claude-code')).toBe('claude-code')
    expect(providerLogo('acp:gemini-cli')).toBe('gemini-cli')
    expect(providerLogo('acp:omp')).toBe('pi')
    expect(providerLogo(HARNESS_PROVIDER_ID)).toBe('pi')
    expect(providerLogo(PAIRDRAW_AI_PROVIDER)).toBe('pairdraw')
  })

  test('leaves generic endpoints and unknown IDs without a logo', () => {
    expect(providerLogo('openai-compatible')).toBeNull()
    expect(providerLogo('anthropic-compatible')).toBeNull()
    expect(providerLogo('custom')).toBeNull()
    expect(providerLogo('acp:unknown')).toBeNull()
  })

  test("shows the maker of a model a router serves, and the router's own logo otherwise", () => {
    expect(providerLogo('openrouter', 'anthropic/claude-sonnet-5.5')).toBe('anthropic')
    expect(providerLogo('openrouter', 'z-ai/glm-5.3')).toBe('zai')
    expect(providerLogo('openrouter', 'acme/unknown-model')).toBe('openrouter')
    expect(providerLogo('amazon-bedrock', 'us.anthropic.claude-opus-5-5')).toBe('anthropic')
    expect(providerLogo('google-vertex', 'claude-sonnet-5-5')).toBe('anthropic')
    expect(providerLogo('google-vertex', 'gemini-4-argon')).toBe('google')
    expect(providerLogo('openai-compatible', 'llama3.3:70b')).toBe('meta')
    expect(providerLogo('openai-compatible', 'my-finetune')).toBeNull()
  })

  test('keeps the logo of a provider that makes its models, and of an agent', () => {
    expect(providerLogo('deepseek', 'deepseek-flash')).toBe('deepseek')
    expect(providerLogo('anthropic', 'claude-opus-5-5')).toBe('anthropic')
    expect(providerLogo('acp:codex', 'gpt-6.1-sol')).toBe('codex')
    expect(providerLogo(HARNESS_PROVIDER_ID, 'anthropic/claude-sonnet-5.5')).toBe('pi')
  })
})

describe('model vendor logo', () => {
  test('reads the vendor routers put before the model', () => {
    expect(modelVendorLogo('anthropic/claude-opus-5.5')).toBe('anthropic')
    expect(modelVendorLogo('openai/gpt-6.1-sol')).toBe('openai')
    expect(modelVendorLogo('google/gemma-4-31b-it:free')).toBe('google')
    expect(modelVendorLogo('deepseek/deepseek-v4-pro')).toBe('deepseek')
    expect(modelVendorLogo('moonshotai/kimi-k3')).toBe('moonshot')
    expect(modelVendorLogo('minimax/minimax-m3.1-flash:free')).toBe('minimax')
    expect(modelVendorLogo('x-ai/grok-4.7')).toBe('xai')
    expect(modelVendorLogo('meta-llama/llama-4-maverick')).toBe('meta')
    expect(modelVendorLogo('mistralai/devstral-medium')).toBe('mistral')
    expect(modelVendorLogo('Qwen/Qwen3-Coder')).toBe('qwen')
  })

  test("reads Bedrock's dotted vendor, with or without a region", () => {
    expect(modelVendorLogo('anthropic.claude-haiku-5-5')).toBe('anthropic')
    expect(modelVendorLogo('eu.meta.llama4-scout')).toBe('meta')
  })

  test('falls back to the model name, after any path a router adds', () => {
    expect(modelVendorLogo('claude-sonnet-5-5')).toBe('anthropic')
    expect(modelVendorLogo('gpt-6-luna')).toBe('openai')
    expect(modelVendorLogo('o4-mini')).toBe('openai')
    expect(modelVendorLogo('glm-5.3-flash')).toBe('zai')
    expect(modelVendorLogo('grok-build-0.1')).toBe('xai')
    expect(modelVendorLogo('kimi-k3')).toBe('kimi')
    expect(modelVendorLogo('accounts/fireworks/models/deepseek-v3p2')).toBe('deepseek')
  })

  test('knows no vendor for a name it does not recognise', () => {
    expect(modelVendorLogo('my-finetune')).toBeNull()
    expect(modelVendorLogo('ollama')).toBeNull()
    expect(modelVendorLogo('')).toBeNull()
  })
})

describe('profile logo source', () => {
  const previous = modelSettingsSnapshot()
  afterEach(() => replaceAIModelSettings(previous))

  const profile: AIModelProfile = {
    id: 'model-a',
    name: 'Design',
    connectionId: 'connection-a',
    modelID: 'anthropic/claude-sonnet-5.5',
    customModelID: '',
    maxOutputTokens: 16_384,
    thinkingLevel: 'default',
    capabilities: ['tools']
  }

  function useConnection(providerID: 'openrouter' | 'acp:codex'): void {
    replaceAIModelSettings({
      version: 1,
      connections: [
        {
          id: 'connection-a',
          providerID,
          customBaseURL: '',
          customAPIType: 'completions',
          credentialProfileId: 'default'
        }
      ],
      models: [profile],
      assignments: { design: 'model-a', review: 'design', fast: null, vision: null }
    })
  }

  test("takes the provider from the profile's connection and prefers a custom model", () => {
    useConnection('openrouter')
    expect(profileLogoSource(profile)).toEqual({
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-5.5'
    })
    expect(profileLogoSource({ ...profile, customModelID: 'x-ai/grok-4.7' }).model).toBe(
      'x-ai/grok-4.7'
    )
  })

  test('has no provider when the connection is gone', () => {
    useConnection('acp:codex')
    expect(profileLogoSource({ ...profile, connectionId: 'missing' }).provider).toBe('')
  })
})
