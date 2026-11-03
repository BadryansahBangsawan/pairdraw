/** The services that generate and edit images: OpenAI's own API, or a server that speaks it. */
export const IMAGE_AI_PROVIDER_IDS = ['openai', 'openai-compatible'] as const

export type ImageAIProviderID = (typeof IMAGE_AI_PROVIDER_IDS)[number]

/** Who removes backgrounds: the image service through its edit endpoint, or remove.bg. */
export const BACKGROUND_SERVICE_IDS = ['image-ai', 'remove-bg'] as const

export type BackgroundServiceID = (typeof BACKGROUND_SERVICE_IDS)[number]

/** The shape of a generated image; each maps to a size the image APIs accept. */
const IMAGE_AI_ORIENTATIONS = ['square', 'landscape', 'portrait'] as const

export type ImageAIOrientation = (typeof IMAGE_AI_ORIENTATIONS)[number]

export interface ImageAIProviderDefinition {
  id: ImageAIProviderID
  /** A brand name, shown as is; the compatible provider's label is translated instead. */
  name: string
  keyURL?: string
  keyPlaceholder: string
}

/** Where a request goes and the key it carries; built when the request starts, never kept. */
export interface ImageAIConnection {
  provider: ImageAIProviderDefinition
  baseURL: string
  model: string
  apiKey: string
}

export interface ImageGenerationRequest {
  prompt: string
  orientation: ImageAIOrientation
  /** Ask for a transparent background; services that cannot give one return an opaque image. */
  transparent?: boolean
}

export interface ImageEditRequest {
  /** PNG bytes of the image to edit. */
  image: Uint8Array
  prompt: string
  transparent?: boolean
}

/** A service refused the key it was sent; the message never quotes the key or the answer. */
export class ImageAIAuthError extends Error {
  readonly service: string

  constructor(service: string) {
    super(`${service} rejected the API key`)
    this.name = 'ImageAIAuthError'
    this.service = service
  }
}

export class ImageAITimeoutError extends Error {
  constructor() {
    super('The image service did not answer in time')
    this.name = 'ImageAITimeoutError'
  }
}

/**
 * What asking a service gave: its result, or what is missing before it can be asked, which
 * Settings → Image services supplies.
 */
export type ImageAIOutcome<T> =
  | { status: 'ok'; value: T; service: string }
  | { status: 'missing-key'; service: string }
  | { status: 'missing-base-url'; service: string }
