import { underlyingGraph } from '#core/figma-api/graph-ref'
import type { ImageVectorizeRequest } from '#core/tools/vector/vectorize'

/** The shape of a generated image; each maps to a size the image services accept. */
export const IMAGE_AI_ORIENTATIONS = ['square', 'landscape', 'portrait'] as const

export type ImageAIOrientation = (typeof IMAGE_AI_ORIENTATIONS)[number]

/** An image in the document a service edits: its hash and its encoded bytes. */
export type ImageAIImage = ImageVectorizeRequest

/**
 * The image services a host set up, such as the app with the user's own keys. Each call answers
 * with the result or rejects with a message the agent can pass on to the user: what to set up,
 * never a key or what a service said about one.
 */
export interface ImageAIService {
  /** PNG, JPEG, or WebP bytes of an image drawn from `prompt`. */
  generateImage(request: {
    prompt: string
    orientation: ImageAIOrientation
    transparent?: boolean
  }): Promise<Uint8Array>
  /** The image's subject on a transparent background. */
  removeBackground(request: ImageAIImage): Promise<Uint8Array>
  /** The image's subject in front of the background `prompt` describes. */
  replaceBackground(request: ImageAIImage & { prompt: string }): Promise<Uint8Array>
  /** SVG markup drawn from `prompt`. */
  generateSVG(request: { prompt: string }): Promise<string>
}

const services = new WeakMap<object, ImageAIService>()

/**
 * Lets the image AI tools run for the documents of `owner`, a document's graph, as
 * `registerImageVectorizer` does for `vectorize_image`.
 */
export function registerImageAIService(owner: object, service: ImageAIService): () => void {
  const target = underlyingGraph(owner)
  services.set(target, service)
  return () => {
    if (services.get(target) === service) services.delete(target)
  }
}

export function getImageAIService(owner: object): ImageAIService | undefined {
  return services.get(underlyingGraph(owner))
}

/** What a tool answers where no host set the services up, such as the CLI or a headless server. */
export const IMAGE_AI_UNAVAILABLE =
  'Image AI runs in the app, with the image service and key set up in Settings → Image services; it is not available here.'
