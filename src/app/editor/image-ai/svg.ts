import * as v from 'valibot'

import { extractVectorizedSVGURL, fetchSVGFromURL } from '@/app/editor/vectorize/providers'
import type { VectorizeProviderID } from '@/app/editor/vectorize/types'

import { imageAIFailure, imageAIFetch, responseText } from './http'

/** Text-to-SVG models write the markup token by token, so a detailed drawing takes minutes. */
const SVG_GENERATION_TIMEOUT_MS = 180_000
const MAX_SVG_BYTES = 20 * 1024 * 1024
const PROMPT_MAX_CHARS = 10_000

const quiverResponseSchema = v.object({
  data: v.pipe(v.array(v.object({ svg: v.pipe(v.string(), v.minLength(1)) })), v.minLength(1))
})

/** Whether `text` is SVG markup rather than a raster a service sent in its place. */
function isSVGDocument(text: string): boolean {
  return /<svg[\s>]/i.test(text.slice(0, 4096))
}

interface SVGServiceRequest {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

/** The text-to-SVG endpoint of each vectorize service, asked for one vector illustration. */
function svgRequest(providerID: VectorizeProviderID, prompt: string, apiKey: string) {
  const json = { 'Content-Type': 'application/json' }
  const requests: Record<VectorizeProviderID, SVGServiceRequest> = {
    recraft: {
      url: 'https://external.api.recraft.ai/v1/images/generations',
      headers: { Authorization: `Bearer ${apiKey}`, ...json },
      body: { prompt, model: 'recraftv3', style: 'vector_illustration', n: 1 }
    },
    fal: {
      url: 'https://fal.run/fal-ai/recraft/v3/text-to-image',
      headers: { Authorization: `Key ${apiKey}`, ...json },
      body: { prompt, style: 'vector_illustration' }
    },
    quiver: {
      url: 'https://api.quiver.ai/v1/svgs/generations',
      headers: { Authorization: `Bearer ${apiKey}`, ...json },
      body: { model: 'arrow-2', prompt, n: 1, stream: false }
    }
  }
  return requests[providerID]
}

/** Statuses that mean the key was refused; Quiver answers 403 for a frozen account instead. */
function authStatuses(providerID: VectorizeProviderID): readonly number[] {
  return providerID === 'quiver' ? [401] : [401, 403]
}

/**
 * Asks a vectorize service to draw `prompt` as SVG with the user's key: Recraft and fal.ai through
 * Recraft's vector illustration style, QuiverAI through Arrow. Answers with the markup.
 */
export async function generateSVGWithService(
  providerID: VectorizeProviderID,
  service: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const request = svgRequest(providerID, prompt.trim().slice(0, PROMPT_MAX_CHARS), apiKey)
  // The same reader as the image services, so a failure quotes its body with the key masked
  // before it is cut short.
  const response = await imageAIFetch(
    request.url,
    {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      credentials: 'omit',
      redirect: 'error'
    },
    {
      maxResponseBytes: MAX_SVG_BYTES,
      timeoutMs: SVG_GENERATION_TIMEOUT_MS,
      sizeError: `${service} response is too large`
    }
  )
  if (!response.ok) throw imageAIFailure(service, response, apiKey, authStatuses(providerID))
  const text = responseText(response)

  let svg: string
  if (providerID === 'quiver') {
    const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), quiverResponseSchema), text)
    if (!parsed.success) throw new Error(`${service} returned no SVG`)
    svg = parsed.output.data[0].svg
  } else {
    const parsed = v.safeParse(v.pipe(v.string(), v.parseJson()), text)
    const url = parsed.success ? extractVectorizedSVGURL(parsed.output) : null
    if (!url) throw new Error(`${service} returned no SVG`)
    svg = await fetchSVGFromURL(providerID, url)
  }
  if (!isSVGDocument(svg)) throw new Error(`${service} returned no SVG`)
  return svg
}
