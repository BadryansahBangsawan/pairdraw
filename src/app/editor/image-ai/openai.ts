import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import {
  imageAIFailure,
  imageAIFetch,
  isRasterImage,
  pngBlob,
  responseText,
  type ImageAIResponse
} from './http'
import type {
  ImageAIConnection,
  ImageAIOrientation,
  ImageAIProviderDefinition,
  ImageAIProviderID,
  ImageEditRequest,
  ImageGenerationRequest
} from './types'

export const OPENAI_BASE_URL = 'https://api.openai.com/v1'

export const IMAGE_AI_PROVIDER_DEFINITIONS: readonly ImageAIProviderDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    keyURL: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…'
  },
  { id: 'openai-compatible', name: 'OpenAI-compatible', keyPlaceholder: 'API key' }
]

export function imageAIProviderDefinition(id: ImageAIProviderID): ImageAIProviderDefinition {
  return (
    IMAGE_AI_PROVIDER_DEFINITIONS.find((definition) => definition.id === id) ??
    IMAGE_AI_PROVIDER_DEFINITIONS[0]
  )
}

/** Sizes gpt-image accepts for each shape. */
const GPT_IMAGE_SIZES: Record<ImageAIOrientation, string> = {
  square: '1024x1024',
  landscape: '1536x1024',
  portrait: '1024x1536'
}

/** Models named like OpenAI's gpt-image family take `background` and `output_format`. */
function isGPTImageModel(model: string): boolean {
  return model.toLowerCase().startsWith('gpt-image')
}

/**
 * An API root a request may go to: HTTPS, or HTTP to this computer for a local server, with no
 * credentials or query in it. Throws for anything else.
 */
export function validateImageAIBaseURL(raw: string): URL {
  const url = new URL(raw.trim())
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('The image service address must use HTTPS')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The image service address must not carry credentials or a query')
  }
  return url
}

function imageAIEndpoint(baseURL: string, path: string): string {
  const root = validateImageAIBaseURL(baseURL)
  return `${root.href.replace(/\/+$/, '')}/${path}`
}

const imageResponseSchema = v.object({
  data: v.pipe(
    v.array(
      v.object({
        b64_json: v.optional(v.nullable(v.string())),
        url: v.optional(v.nullable(v.string()))
      })
    ),
    v.minLength(1)
  )
})

/** Where a service may link its result: HTTPS, or the server the request went to. */
function validateResultURL(raw: string, baseURL: string): URL {
  const url = new URL(raw)
  const base = validateImageAIBaseURL(baseURL)
  if (url.protocol !== 'https:' && url.origin !== base.origin) {
    throw new Error('The image service linked its result over an insecure address')
  }
  return url
}

async function downloadResult(raw: string, connection: ImageAIConnection): Promise<Uint8Array> {
  const url = validateResultURL(raw, connection.baseURL)
  const response = await imageAIFetch(url.href, { method: 'GET' })
  if (!response.ok) throw new Error(`Could not download the image (${response.status})`)
  return response.bytes
}

/** The image an Images API answer carries, inline as base64 or behind a link. */
async function readImageResponse(
  response: ImageAIResponse,
  connection: ImageAIConnection
): Promise<Uint8Array> {
  const name = connection.provider.name
  if (!response.ok) throw imageAIFailure(name, response, connection.apiKey)
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), imageResponseSchema),
    responseText(response)
  )
  if (!parsed.success) throw new Error(`${name} returned no image`)
  const [first] = parsed.output.data
  let bytes: Uint8Array | null = null
  if (first.b64_json && isValid(first.b64_json)) bytes = toUint8Array(first.b64_json)
  else if (first.url) bytes = await downloadResult(first.url, connection)
  if (!bytes || !isRasterImage(bytes)) throw new Error(`${name} returned no image`)
  return bytes
}

function headers(connection: ImageAIConnection): Record<string, string> {
  return { Authorization: `Bearer ${connection.apiKey}` }
}

/** Generates one image from a prompt with the Images API's generations endpoint. */
export async function generateImage(
  connection: ImageAIConnection,
  request: ImageGenerationRequest
): Promise<Uint8Array> {
  const gptImage = isGPTImageModel(connection.model)
  const body: Record<string, unknown> = {
    model: connection.model,
    prompt: request.prompt,
    n: 1,
    size: gptImage ? GPT_IMAGE_SIZES[request.orientation] : '1024x1024'
  }
  if (gptImage) {
    body.output_format = 'png'
    if (request.transparent) body.background = 'transparent'
  } else {
    body.response_format = 'b64_json'
  }
  const response = await imageAIFetch(imageAIEndpoint(connection.baseURL, 'images/generations'), {
    method: 'POST',
    headers: { ...headers(connection), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return readImageResponse(response, connection)
}

/** Edits an image by a prompt with the Images API's edits endpoint, keeping its proportions. */
export async function editImage(
  connection: ImageAIConnection,
  request: ImageEditRequest
): Promise<Uint8Array> {
  const form = new FormData()
  form.append('model', connection.model)
  form.append('prompt', request.prompt)
  form.append('n', '1')
  form.append('image', pngBlob(request.image), 'image.png')
  if (isGPTImageModel(connection.model)) {
    form.append('size', 'auto')
    form.append('output_format', 'png')
    if (request.transparent) form.append('background', 'transparent')
  } else {
    form.append('response_format', 'b64_json')
  }
  const response = await imageAIFetch(imageAIEndpoint(connection.baseURL, 'images/edits'), {
    method: 'POST',
    headers: headers(connection),
    body: form
  })
  return readImageResponse(response, connection)
}

export const REMOVE_BACKGROUND_PROMPT =
  'Remove the background completely. Keep the main subject exactly as it is, with the same ' +
  'pose, colours, proportions and framing, on a fully transparent background.'

/** The edit prompt that keeps the subject and puts it in the scene described. */
export function replaceBackgroundPrompt(description: string): string {
  return (
    'Keep the main subject exactly as it is, with the same pose, colours, proportions and ' +
    `framing, and replace everything behind it with this background: ${description.trim()}`
  )
}
