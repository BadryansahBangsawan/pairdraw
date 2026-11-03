import { shallowRef } from 'vue'

import type { EditorStore } from '@/app/editor/active-store'

import { singleSelectedNode } from './apply'

/** What a prompt asks for: a new background, an image fill, an image layer, or SVG layers. */
export type ImageAIPromptMode =
  | 'replace-background'
  | 'generate-fill'
  | 'generate-image'
  | 'generate-svg'

export interface ImageAIPromptRequest {
  mode: ImageAIPromptMode
  store: EditorStore
  /** The layer a background or fill request is for, chosen when the dialog opened. */
  nodeId: string | null
  /** The image fill a fill request is for, as the fill picker edits one; else the layer's image. */
  fillIndex?: number
}

/** The prompt dialog's request while it is open; null once it closes. */
export const imageAIPrompt = shallowRef<ImageAIPromptRequest | null>(null)

/**
 * Asks for a prompt; background and fill requests are for the one layer selected now, and a fill
 * request from the fill picker for the image fill it edits.
 */
export function openImageAIPrompt(
  store: EditorStore,
  mode: ImageAIPromptMode,
  { fillIndex }: { fillIndex?: number } = {}
): void {
  const forLayer = mode === 'replace-background' || mode === 'generate-fill'
  const nodeId = forLayer ? (singleSelectedNode(store)?.id ?? null) : null
  if (forLayer && !nodeId) return
  imageAIPrompt.value = {
    mode,
    store,
    nodeId,
    ...(mode === 'generate-fill' && fillIndex !== undefined ? { fillIndex } : {})
  }
}

export function closeImageAIPrompt(): void {
  imageAIPrompt.value = null
}
