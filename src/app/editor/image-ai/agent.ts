import type { EditorStore } from '@/app/editor/active-store'

import {
  imageAICanvasKit,
  requestBackgroundRemoval,
  requestBackgroundReplacement,
  requestImageGeneration,
  requestSVGGeneration
} from './request'
import { ImageAIAuthError, type ImageAIOrientation, type ImageAIOutcome } from './types'

/**
 * The image services agents reach through the image AI tools. The tools live in Core, which
 * applies what these return to the document; the services and keys stay in the app.
 */
export interface AgentImageAIService {
  /** PNG, JPEG or WebP bytes of an image drawn from `prompt`. */
  generateImage(request: {
    prompt: string
    orientation: ImageAIOrientation
    transparent?: boolean
  }): Promise<Uint8Array>
  /** The image's subject on a transparent background, as PNG bytes. */
  removeBackground(request: { imageHash: string; bytes: Uint8Array }): Promise<Uint8Array>
  /** The image's subject in front of the background `prompt` describes. */
  replaceBackground(request: {
    imageHash: string
    bytes: Uint8Array
    prompt: string
  }): Promise<Uint8Array>
  /** SVG markup drawn from `prompt`, which the tool imports as editable layers. */
  generateSVG(request: { prompt: string }): Promise<string>
}

/**
 * The value a request gave, or an error the agent relays to the user: what to set up in
 * Settings, never the key or anything the service said about it.
 */
async function agentResult<T>(request: () => Promise<ImageAIOutcome<T>>): Promise<T> {
  let outcome: ImageAIOutcome<T>
  try {
    outcome = await request()
  } catch (error) {
    if (!(error instanceof ImageAIAuthError)) throw error
    throw new Error(
      `${error.service} rejected the saved API key. Ask the user to update it in Settings → Image services.`,
      { cause: error }
    )
  }
  if (outcome.status === 'missing-key') {
    throw new Error(
      `No ${outcome.service} API key is saved. Ask the user to add one in Settings → Image services, then try again.`
    )
  }
  if (outcome.status === 'missing-base-url') {
    throw new Error(
      `The ${outcome.service} image service has no address. Ask the user to add it in Settings → Image services, then try again.`
    )
  }
  return outcome.value
}

export function createAgentImageAIService(store: EditorStore): AgentImageAIService {
  return {
    generateImage: (request) => agentResult(() => requestImageGeneration(request)),
    removeBackground: async ({ bytes }) => {
      const ck = await imageAICanvasKit(store)
      return agentResult(() => requestBackgroundRemoval(ck, bytes))
    },
    replaceBackground: async ({ bytes, prompt }) => {
      const ck = await imageAICanvasKit(store)
      return agentResult(() => requestBackgroundReplacement(ck, bytes, prompt))
    },
    generateSVG: ({ prompt }) => agentResult(() => requestSVGGeneration(prompt))
  }
}

/**
 * Lets agent tool calls on `store`'s document use the app's image services. `register` is Core's
 * registry for them, `registerImageAIService` from `@open-pencil/core/tools`, keyed by the graph
 * as `registerImageVectorizer` is.
 */
export function bindAgentImageAIService(
  store: EditorStore,
  register: (owner: object, service: AgentImageAIService) => unknown
): void {
  register(store.graph, createAgentImageAIService(store))
}
