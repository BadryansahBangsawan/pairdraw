import { renderRegionToImage } from '@pairdraw/core/io/formats/raster'
import type { CommentThread } from '@pairdraw/scene-graph'
import { commentPosition } from '@pairdraw/scene-graph/comments'
import type { VisualBounds } from '@pairdraw/scene-graph/geometry'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import { createImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import type { ImageAttachmentDraft } from '@/app/ai/attachment/image/types'
import { commentThreadsPrompt } from '@/app/ai/chat/entry/comments'
import { acceptsDocumentPrompts, runPromptInDocument } from '@/app/ai/chat/entry/run'
import type { EditorStore } from '@/app/editor/active-store'

import { regionCanvasBounds } from './region'

/** Context kept around a marked area in its crop, in canvas units. */
export const REGION_CROP_MARGIN = 16

/** Longest edge of the crop sent with the prompt, in pixels; enough to judge contrast and spacing. */
export const REGION_CROP_MAX_EDGE = 768

/** The part of the page a drawn thread's crop shows, and the scale it is rendered at. */
export function regionCrop(
  region: NonNullable<CommentThread['region']>,
  at: Vector
): { bounds: VisualBounds; scale: number } {
  const bounds = regionCanvasBounds(region, at)
  const padded: VisualBounds = {
    minX: bounds.minX - REGION_CROP_MARGIN,
    minY: bounds.minY - REGION_CROP_MARGIN,
    maxX: bounds.maxX + REGION_CROP_MARGIN,
    maxY: bounds.maxY + REGION_CROP_MARGIN
  }
  const longestEdge = Math.max(padded.maxX - padded.minX, padded.maxY - padded.minY)
  return {
    bounds: padded,
    scale: longestEdge > 0 ? Math.min(1, REGION_CROP_MAX_EDGE / longestEdge) : 0
  }
}

/** One PNG of the marked area, or none when this tab cannot render it. */
async function regionImage(
  store: EditorStore,
  thread: CommentThread
): Promise<ImageAttachmentDraft | null> {
  const renderer = store.renderer
  if (!renderer || !thread.region) return null
  const crop = regionCrop(thread.region, commentPosition(store.graph, thread))
  if (crop.scale <= 0) return null
  const bytes = await renderRegionToImage(
    renderer.ck,
    store.graph,
    thread.pageId,
    crop.bounds,
    crop.scale,
    { pageColor: renderer.pageColor }
  )
  if (!bytes) return null
  const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
  return {
    file: new File([blob], 'marked-area.png', { type: 'image/png' }),
    previewURL: createImagePreviewURL(blob)
  }
}

/**
 * Sends a thread to its document's chat: the note, and for a drawn thread the area it marks, the
 * layers inside it and one crop of it. False when the chat cannot take it, as when the document is
 * not open for edits or the setup was dismissed.
 */
export async function fixThreadWithAgent(
  store: EditorStore,
  thread: CommentThread
): Promise<boolean> {
  if (!acceptsDocumentPrompts(store)) return false
  const prompt = commentThreadsPrompt(store.graph, [thread])
  if (!prompt) return false
  const image = await regionImage(store, thread)
  return runPromptInDocument(store, prompt, { images: image ? [image] : [] })
}
