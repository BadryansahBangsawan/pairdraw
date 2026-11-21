import { uniq } from 'es-toolkit/array'
import * as v from 'valibot'

import { AI_PROVIDERS } from '@pairdraw/core/constants'
import type { AIProviderID, ModelOption } from '@pairdraw/core/constants'

import { cachedRemoteJSON } from '@/app/cache/remote'

import { listChatGPTModels } from './chatgpt'

const MODELS_DEV_URL = 'https://models.dev/api.json'
const MODELS_DEV_CACHE_KEY = 'models-dev/catalog'
const MODELS_DEV_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const PROVIDER_KEYS: Partial<Record<AIProviderID, readonly string[]>> = {
  openrouter: ['openrouter'],
  anthropic: ['anthropic'],
  openai: ['openai'],
  google: ['google'],
  deepseek: ['deepseek'],
  zai: ['zhipuai'],
  minimax: ['minimax'],
  xai: ['xai'],
  meta: ['meta'],
  'kimi-for-coding': ['kimi-code-plan-global'],
  moonshot: ['moonshotai'],
  together: ['togetherai'],
  fireworks: ['fireworks-ai'],
  'opencode-zen': ['opencode'],
  'opencode-go': ['opencode-go']
}

/**
 * OpenCode serves some models only through Anthropic's, Google's, or OpenAI's own APIs, named by
 * the model's `provider.npm` in models.dev. Its presets speak the chat completions API, so they
 * list only the models that endpoint serves.
 */
const CHAT_COMPLETIONS_ONLY = new Set<AIProviderID>(['opencode-zen', 'opencode-go'])
const CHAT_COMPLETIONS_PACKAGE = '@ai-sdk/openai-compatible'

type ModelsDevModel = {
  id?: unknown
  name?: unknown
  attachment?: unknown
  tool_call?: unknown
  status?: unknown
  release_date?: unknown
  modalities?: { output?: unknown }
  limit?: { output?: unknown; context?: unknown }
  /** List price per million tokens, as models.dev lists it; cache_read is the cached-input rate. */
  cost?: { input?: unknown; output?: unknown; cache_read?: unknown }
  /** Overrides the provider's API for this model, such as `{ npm: '@ai-sdk/anthropic' }`. */
  provider?: { npm?: unknown }
}

type ModelsDevProvider = {
  models?: Record<string, ModelsDevModel>
}

type ModelsDevCatalog = Record<string, ModelsDevProvider>

const modelsDevCatalogSchema = v.record(
  v.string(),
  v.object({
    models: v.optional(
      v.record(
        v.string(),
        v.looseObject({
          modalities: v.optional(v.looseObject({ output: v.optional(v.unknown()) })),
          limit: v.optional(
            v.looseObject({ output: v.optional(v.unknown()), context: v.optional(v.unknown()) })
          ),
          cost: v.optional(
            v.looseObject({
              input: v.optional(v.unknown()),
              output: v.optional(v.unknown()),
              cache_read: v.optional(v.unknown())
            })
          ),
          provider: v.optional(v.looseObject({ npm: v.optional(v.unknown()) }))
        })
      )
    )
  })
) satisfies v.GenericSchema<unknown, ModelsDevCatalog>

function normalizedStatus(status: unknown): ModelOption['status'] {
  if (status === 'beta' || status === 'deprecated') return status
  return 'active'
}

/** A model's price per million tokens from its catalog cost, or null without both rates. */
function modelPricing(cost: ModelsDevModel['cost']): ModelOption['pricing'] | null {
  const input = cost?.input
  const output = cost?.output
  if (typeof input !== 'number' || typeof output !== 'number') return null
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return null
  const pricing: NonNullable<ModelOption['pricing']> = {
    inputPerMTok: input,
    outputPerMTok: output
  }
  const cacheRead = cost?.cache_read
  if (typeof cacheRead === 'number' && Number.isFinite(cacheRead) && cacheRead >= 0) {
    pricing.cacheReadPerMTok = cacheRead
  }
  return pricing
}

function normalizeModel(id: string, model: ModelsDevModel): ModelOption {
  const capabilities: ('tools' | 'vision')[] = []
  if (model.tool_call === true) capabilities.push('tools')
  if (model.attachment === true) capabilities.push('vision')
  const normalized: ModelOption = {
    id,
    name: typeof model.name === 'string' && model.name ? model.name : id,
    capabilities,
    status: normalizedStatus(model.status)
  }
  const output = model.limit?.output
  if (typeof output === 'number' && Number.isFinite(output)) {
    normalized.recommendedMaxOutputTokens = Math.min(128_000, Math.max(1024, output))
  }
  if (typeof model.release_date === 'string') normalized.releaseDate = model.release_date
  const pricing = modelPricing(model.cost)
  if (pricing) normalized.pricing = pricing
  return normalized
}

const modelsDevCatalog = cachedRemoteJSON({
  key: MODELS_DEV_CACHE_KEY,
  schema: modelsDevCatalogSchema,
  maxAgeMs: MODELS_DEV_CACHE_TTL_MS,
  load: async (fetcher) => {
    const response = await fetcher(MODELS_DEV_URL)
    if (!response.ok) throw new Error(`models.dev catalog request failed: ${response.status}`)
    // Validated like the cached copy, so a bad entry falls back instead of crashing the list.
    return v.parse(v.pipe(v.string(), v.parseJson(), modelsDevCatalogSchema), await response.text())
  }
})

function modelIDCandidates(providerKey: string, modelID: string): string[] {
  const unprefixed = modelID.startsWith(`${providerKey}/`)
    ? modelID.slice(providerKey.length + 1)
    : modelID
  return uniq([
    modelID,
    unprefixed,
    unprefixed.replace(/-\d{8}$/, ''),
    unprefixed.replace(/:[a-z0-9-]+$/, '')
  ])
}

function curatedProviderModels(providerID: AIProviderID): ModelOption[] {
  return AI_PROVIDERS.find((provider) => provider.id === providerID)?.models ?? []
}

/** Whether the preset's API reaches the model: OpenCode's chat presets reach only chat models. */
function reachable(providerID: AIProviderID, model: ModelsDevModel): boolean {
  if (!CHAT_COMPLETIONS_ONLY.has(providerID)) return true
  const sdk = model.provider?.npm
  return sdk === undefined || sdk === CHAT_COMPLETIONS_PACKAGE
}

function supportsDesignWork(model: ModelsDevModel): boolean {
  if (model.tool_call !== true || model.status === 'deprecated') return false
  const outputModalities = model.modalities?.output
  return Array.isArray(outputModalities) && outputModalities.includes('text')
}

function mergeCuratedModels(curated: ModelOption[], catalog: ModelOption[]): ModelOption[] {
  const catalogById = new Map(catalog.map((model) => [model.id, model]))
  const recommended = curated.map((model) => ({
    ...catalogById.get(model.id),
    ...model,
    capabilities: catalogById.get(model.id)?.capabilities ?? model.capabilities,
    recommendedMaxOutputTokens:
      catalogById.get(model.id)?.recommendedMaxOutputTokens ?? model.recommendedMaxOutputTokens
  }))
  const curatedIds = new Set(curated.map((model) => model.id))
  const remaining = catalog
    .filter((model) => !curatedIds.has(model.id))
    .sort((left, right) => (right.releaseDate ?? '').localeCompare(left.releaseDate ?? ''))
  return [...recommended, ...remaining]
}

/** The account's own list in its order; recommended models keep their names and tags. */
function withCuratedNames(curated: ModelOption[], listed: ModelOption[]): ModelOption[] {
  const curatedById = new Map(curated.map((model) => [model.id, model]))
  return listed.map((model) => {
    const known = curatedById.get(model.id)
    return known ? { ...model, name: known.name, tag: known.tag } : model
  })
}

export async function listCatalogModels(
  providerID: AIProviderID,
  fetcher?: typeof fetch
): Promise<ModelOption[]> {
  const curated = curatedProviderModels(providerID)
  if (providerID === 'chatgpt') {
    const listed = await listChatGPTModels()
    return listed ? withCuratedNames(curated, listed) : curated
  }
  const providerKeys = PROVIDER_KEYS[providerID]
  if (!providerKeys?.length) return curated
  const catalog = await modelsDevCatalog.get(fetcher)
  if (!catalog) return curated

  const models = providerKeys.flatMap((providerKey) =>
    Object.entries(catalog[providerKey]?.models ?? {})
      .filter(([, model]) => supportsDesignWork(model) && reachable(providerID, model))
      .map(([id, model]) => normalizeModel(id, model))
  )
  return models.length ? mergeCuratedModels(curated, models) : curated
}

/** The models.dev entry of a provider's model, tried under the IDs the provider may use for it. */
async function findModelsDevModel(
  providerID: AIProviderID,
  modelID: string,
  fetcher?: typeof fetch
): Promise<ModelsDevModel | null> {
  const providerKeys = PROVIDER_KEYS[providerID]
  if (!providerKeys?.length || !modelID) return null
  const catalog = await modelsDevCatalog.get(fetcher)
  if (!catalog) return null

  for (const providerKey of providerKeys) {
    const models = catalog[providerKey]?.models
    for (const candidate of modelIDCandidates(providerKey, modelID)) {
      const matched = models?.[candidate]
      if (matched && reachable(providerID, matched)) return matched
    }
  }
  return null
}

export async function resolveModelsDevModel(
  providerID: AIProviderID,
  modelID: string,
  fetcher?: typeof fetch
): Promise<ModelOption | null> {
  const matched = await findModelsDevModel(providerID, modelID, fetcher)
  return matched ? normalizeModel(modelID, matched) : null
}

/** How many tokens the model's context window holds, as models.dev lists it, or null. */
export async function resolveModelContextWindow(
  providerID: AIProviderID,
  modelID: string,
  fetcher?: typeof fetch
): Promise<number | null> {
  const context = (await findModelsDevModel(providerID, modelID, fetcher))?.limit?.context
  return typeof context === 'number' && Number.isFinite(context) && context > 0 ? context : null
}

/** The model's list price per million tokens, as models.dev lists it, or null when unknown. */
export async function resolveModelPricing(
  providerID: AIProviderID,
  modelID: string,
  fetcher?: typeof fetch
): Promise<ModelOption['pricing'] | null> {
  return modelPricing((await findModelsDevModel(providerID, modelID, fetcher))?.cost)
}

export function resetModelsDevCatalogForTests(): void {
  modelsDevCatalog.reset()
}
