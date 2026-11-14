import { registerImageVectorizer, type ImageVectorizer } from '@pairdraw/core/tools'

import type { EditorStore } from '@/app/editor/active-store'

import { requestVectorSVG, selectedVectorizeProvider } from './request'
import { VectorizeAuthError } from './types'

/**
 * The vectorize service agents reach through `vectorize_image`: the one chosen in Settings, with
 * the key saved there, which never leaves the app. Failures read as instructions for the agent,
 * since it relays them to the user.
 */
export function createAgentImageVectorizer(store: EditorStore): ImageVectorizer {
  return {
    async vectorize({ bytes }) {
      const provider = selectedVectorizeProvider()
      let result: Awaited<ReturnType<typeof requestVectorSVG>>
      try {
        result = await requestVectorSVG(store, provider, bytes)
      } catch (error) {
        if (!(error instanceof VectorizeAuthError)) throw error
        throw new Error(
          `${provider.name} rejected the saved API key. Ask the user to update it in Settings → Image services.`,
          { cause: error }
        )
      }
      if (result.status === 'missing-key') {
        throw new Error(
          `No ${provider.name} API key is saved. Ask the user to add one in Settings → Image services, then try again.`
        )
      }
      return result.svg
    }
  }
}

/** Lets agent tool calls on `store`'s document vectorize images with the app's service. */
export function bindAgentImageVectorizer(store: EditorStore): void {
  registerImageVectorizer(store.graph, createAgentImageVectorizer(store))
}
