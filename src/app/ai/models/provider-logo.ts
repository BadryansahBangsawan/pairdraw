import { HARNESS_PROVIDER_ID } from '@pairdraw/core/constants'

import { PAIRDRAW_AI_PROVIDER } from '@/app/ai/providers/pairdraw/provider'

import { modelConnection } from './store'
import type { AIModelProfile } from './types'

/** The brands `ProviderLogo` draws: AI companies, platforms, local servers, and coding agents. */
const PROVIDER_LOGOS = [
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'deepseek',
  'zai',
  'minimax',
  'xai',
  'meta',
  'kimi',
  'moonshot',
  'mistral',
  'qwen',
  'together',
  'fireworks',
  'opencode',
  'amazon-bedrock',
  'google-vertex',
  'ollama',
  'lmstudio',
  'claude-code',
  'codex',
  'gemini-cli',
  'pi',
  'pairdraw'
] as const

export type ProviderLogoID = (typeof PROVIDER_LOGOS)[number]

/** Providers, agents, and server presets by their ID; generic endpoints have no brand. */
const PROVIDER_BRANDS: Readonly<Partial<Record<string, ProviderLogoID>>> = {
  anthropic: 'anthropic',
  openai: 'openai',
  chatgpt: 'openai',
  google: 'google',
  openrouter: 'openrouter',
  deepseek: 'deepseek',
  zai: 'zai',
  minimax: 'minimax',
  xai: 'xai',
  meta: 'meta',
  'kimi-for-coding': 'kimi',
  moonshot: 'moonshot',
  together: 'together',
  fireworks: 'fireworks',
  'opencode-zen': 'opencode',
  'opencode-go': 'opencode',
  'amazon-bedrock': 'amazon-bedrock',
  'google-vertex': 'google-vertex',
  ollama: 'ollama',
  lmstudio: 'lmstudio',
  'acp:claude-code': 'claude-code',
  'acp:codex': 'codex',
  'acp:gemini-cli': 'gemini-cli',
  [HARNESS_PROVIDER_ID]: 'pi',
  [PAIRDRAW_AI_PROVIDER]: 'pairdraw'
}

/**
 * Providers that serve other companies' models, so a model's own maker identifies it better than
 * the provider does. Agents stay out: the agent is what the person chose, whatever model it runs.
 */
const ROUTING_PROVIDERS: ReadonlySet<string> = new Set([
  'openrouter',
  'together',
  'fireworks',
  'opencode-zen',
  'opencode-go',
  'amazon-bedrock',
  'google-vertex',
  'openai-compatible',
  'anthropic-compatible',
  PAIRDRAW_AI_PROVIDER
])

/** Model makers by the vendor prefix routers put before a model, as in `anthropic/claude-…`. */
const VENDOR_BRANDS: Readonly<Partial<Record<string, ProviderLogoID>>> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  deepseek: 'deepseek',
  'deepseek-ai': 'deepseek',
  'z-ai': 'zai',
  zai: 'zai',
  'zai-org': 'zai',
  minimax: 'minimax',
  minimaxai: 'minimax',
  'x-ai': 'xai',
  xai: 'xai',
  meta: 'meta',
  'meta-llama': 'meta',
  moonshotai: 'moonshot',
  moonshot: 'moonshot',
  mistral: 'mistral',
  mistralai: 'mistral',
  qwen: 'qwen'
}

/** Model makers by how their model names start, for routers that leave the vendor out. */
const MODEL_NAME_BRANDS: readonly [RegExp, ProviderLogoID][] = [
  [/^claude/, 'anthropic'],
  [/^(chat)?gpt/, 'openai'],
  [/^o\d+(-|$)/, 'openai'],
  [/^(gemini|gemma)/, 'google'],
  [/^deepseek/, 'deepseek'],
  [/^glm/, 'zai'],
  [/^minimax/, 'minimax'],
  [/^grok/, 'xai'],
  [/^(llama|muse)/, 'meta'],
  [/^kimi/, 'kimi'],
  [/^(mistral|ministral|magistral|codestral|devstral)/, 'mistral'],
  [/^(qwen|qwq)/, 'qwen']
]

/** Bedrock's model IDs: an optional region, the vendor, then the model (`us.anthropic.claude-…`). */
const DOTTED_VENDOR = /^(?:[a-z]{2,6}\.)?([a-z-]+)\.(.+)$/

/**
 * The company that made a model, from its ID: `anthropic/claude-sonnet-5.5`,
 * `us.anthropic.claude-opus-5-5`, or a bare name such as `claude-sonnet-5-5` or `llama3.3:70b`.
 */
export function modelVendorLogo(modelID: string): ProviderLogoID | null {
  const id = modelID.trim().toLowerCase()
  const slash = id.indexOf('/')
  if (slash > 0) {
    const vendor = VENDOR_BRANDS[id.slice(0, slash)]
    if (vendor) return vendor
    return modelNameLogo(id.slice(id.lastIndexOf('/') + 1))
  }
  const dotted = DOTTED_VENDOR.exec(id)
  const vendor = dotted ? VENDOR_BRANDS[dotted[1]] : undefined
  if (vendor) return vendor
  return modelNameLogo(id)
}

function modelNameLogo(name: string): ProviderLogoID | null {
  return MODEL_NAME_BRANDS.find(([pattern]) => pattern.test(name))?.[1] ?? null
}

/** Whether the provider serves other companies' models, so each model shows its maker's logo. */
export function servesOtherMakers(providerID: string): boolean {
  return ROUTING_PROVIDERS.has(providerID)
}

/**
 * The logo for a provider, coding agent, or server preset such as `ollama`; null for a generic
 * endpoint. With a model, a provider that serves other companies' models shows the model's maker
 * when the ID names one, so an OpenRouter profile running Claude shows Claude's logo.
 */
export function providerLogo(providerID: string, modelID?: string): ProviderLogoID | null {
  if (modelID && servesOtherMakers(providerID)) {
    const vendor = modelVendorLogo(modelID)
    if (vendor) return vendor
  }
  return PROVIDER_BRANDS[providerID] ?? null
}

/** What a model profile's logo comes from: its connection's provider and the model it runs. */
export function profileLogoSource(profile: AIModelProfile): { provider: string; model: string } {
  return {
    provider: modelConnection(profile.connectionId)?.providerID ?? '',
    model: profile.customModelID || profile.modelID
  }
}
