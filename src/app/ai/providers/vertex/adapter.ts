import { AnthropicLanguageModel } from '@ai-sdk/anthropic/internal'
import { GoogleLanguageModel } from '@ai-sdk/google/internal'
import { generateId } from 'ai'
import { omit } from 'es-toolkit'
import * as v from 'valibot'

import type { ModelProviderAdapter } from '@/app/ai/providers/types'
import type { FetchFunction } from '@/app/http/types'

import { parseVertexCredential, vertexAuthHeaders } from './credential'
import { parseVertexBaseURL, vertexBaseURL } from './endpoint'

/** The Messages API version Vertex AI takes in the body instead of a header. */
export const VERTEX_ANTHROPIC_VERSION = 'vertex-2023-10-16'

/**
 * Structured outputs are generally available, so this beta needs no flag at all. Other betas the
 * AI SDK adds, such as PDF input, move into the body, since Vertex AI's CORS answer rejects the
 * `anthropic-beta` header and `:rawPredict` reads `anthropic_beta` from the body instead.
 */
const GA_BETAS = new Set(['structured-outputs-2025-11-13'])

const requestBodySchema = v.record(v.string(), v.unknown())

export function isVertexClaudeModel(modelID: string): boolean {
  return modelID.startsWith('claude-')
}

function withBetas(
  body: BodyInit | null | undefined,
  betas: string[]
): BodyInit | null | undefined {
  if (!betas.length || typeof body !== 'string') return body
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), requestBodySchema), body)
  if (!parsed.success) return body
  return JSON.stringify({ ...parsed.output, anthropic_beta: betas })
}

/** Sends a Claude request's betas in the body, without the header the browser cannot send. */
export function vertexAnthropicFetch(fetchImpl?: FetchFunction): FetchFunction {
  return (input, init) => {
    const headers = new Headers(init?.headers)
    const betas = (headers.get('anthropic-beta') ?? '')
      .split(',')
      .map((beta) => beta.trim())
      .filter((beta) => beta && !GA_BETAS.has(beta))
    headers.delete('anthropic-beta')
    const body = withBetas(init?.body, betas)
    return (fetchImpl ?? globalThis.fetch)(input, { ...init, headers, body })
  }
}

/** The request body Vertex AI's `:rawPredict` takes: the model is in the URL, the version here. */
export function vertexAnthropicBody(args: Record<string, unknown>): Record<string, unknown> {
  return { ...omit(args, ['model']), anthropic_version: VERTEX_ANTHROPIC_VERSION }
}

function modelPath(modelID: string): string {
  // Dated Claude snapshots use `@`, which Vertex AI expects as it is.
  return encodeURIComponent(modelID).replace(/%40/g, '@')
}

/**
 * Vertex AI serves Claude (publisher `anthropic`) and Gemini (publisher `google`) from one
 * project; the model ID picks the publisher.
 */
export const vertexAdapter: ModelProviderAdapter = {
  create(config, runtime) {
    const base = vertexBaseURL(parseVertexBaseURL(config.customBaseURL))
    const headers = vertexAuthHeaders(parseVertexCredential(config.apiKey))
    const modelID = config.customModelID.trim() || config.modelID
    // Vertex AI reads images and documents only from the request, never from a URL.
    const supportedUrls = () => ({})
    if (isVertexClaudeModel(modelID)) {
      return new AnthropicLanguageModel(modelID, {
        provider: 'vertex.anthropic.messages',
        baseURL: `${base}/publishers/anthropic/models`,
        headers,
        fetch: vertexAnthropicFetch(runtime.fetch),
        buildRequestUrl: (baseURL, streaming) =>
          `${baseURL}/${modelPath(modelID)}:${streaming ? 'streamRawPredict' : 'rawPredict'}`,
        transformRequestBody: vertexAnthropicBody,
        supportedUrls
      })
    }
    return new GoogleLanguageModel(modelID, {
      provider: 'google.vertex.chat',
      baseURL: `${base}/publishers/google`,
      headers,
      fetch: runtime.fetch,
      generateId,
      supportedUrls
    })
  }
}
