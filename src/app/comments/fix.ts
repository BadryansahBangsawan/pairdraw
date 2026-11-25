import { renderRegionToImage } from '@pairdraw/core/io/formats/raster'
import type { CommentThread } from '@pairdraw/scene-graph'
import { commentPosition } from '@pairdraw/scene-graph/comments'
import type { VisualBounds } from '@pairdraw/scene-graph/geometry'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import { createImagePreviewURL, revokeImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import type { ImageAttachmentDraft } from '@/app/ai/attachment/image/types'
import { commentThreadsPrompt } from '@/app/ai/chat/entry/comments'
import { acceptsDocumentPrompts, runPromptInDocument } from '@/app/ai/chat/entry/run'
import type { EditorStore } from '@/app/editor/active-store'

import { regionCanvasBounds } from './region'

/** Context kept around a marked area in its crop, in canvas units. */
export const REGION_CROP_MARGIN = 16

/** Longest edge of the crop sent with the prompt, in pixels; enough to judge contrast and spacing. */
export const REGION_CROP_MAX_EDGE = 768

/**
 * The part of the page a drawn thread's crop shows, and the scale it is rendered at. A page is an
 * unbounded canvas (its `CANVAS` node has no width or height), so there is no page rect to clip
 * the crop to; a ring drawn past the visible content still renders, with the page colour behind.
 */
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

/** What one Fix click needs from outside: the crop renderer and the chat's door. */
export interface FixAgentDeps {
  renderRegion: typeof renderRegionToImage
  accepts: typeof acceptsDocumentPrompts
  send: typeof runPromptInDocument
}

const liveDeps: FixAgentDeps = {
  renderRegion: renderRegionToImage,
  accepts: acceptsDocumentPrompts,
  send: runPromptInDocument
}

/** One PNG of the marked area, or none when this tab cannot render it. */
async function regionImage(
  store: EditorStore,
  thread: CommentThread,
  renderRegion: typeof renderRegionToImage
): Promise<ImageAttachmentDraft | null> {
  const renderer = store.renderer
  if (!renderer || !thread.region) return null
  const crop = regionCrop(thread.region, commentPosition(store.graph, thread))
  if (crop.scale <= 0) return null
  const bytes = await renderRegion(
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
  thread: CommentThread,
  deps: FixAgentDeps = liveDeps
): Promise<boolean> {
  if (!deps.accepts(store)) return false
  const image = await regionImage(store, thread, deps.renderRegion)
  const prompt = commentThreadsPrompt(store.graph, [thread], { regionImages: image !== null })
  if (!prompt) {
    if (image) revokeImagePreviewURL(image.previewURL)
    return false
  }
  const sent = await deps.send(store, prompt, { images: image ? [image] : [] })
  // The chat can refuse the prompt after setup is dismissed; the blob would then outlive its use.
  if (!sent && image) revokeImagePreviewURL(image.previewURL)
  return sent
}
