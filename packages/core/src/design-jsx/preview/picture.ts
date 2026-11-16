import type { CanvasKit, SkPicture } from 'canvaskit-wasm'

import { computeDescendantVisualBounds, type VisualBounds } from '@pairdraw/scene-graph/geometry'

import { SkiaRenderer } from '#core/canvas/renderer'
import { recordWorldPicture } from '#core/canvas/renderer/picture'

import type { StagedJSXPreview } from './stage'

const MAX_PREVIEW_DIMENSION = 8192

function fitsPreview({ minX, minY, maxX, maxY }: VisualBounds): boolean {
  const width = maxX - minX
  const height = maxY - minY
  return (
    Number.isFinite(width + height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_PREVIEW_DIMENSION &&
    height <= MAX_PREVIEW_DIMENSION
  )
}

async function recordStaged(
  renderer: SkiaRenderer,
  { graph, pageId, nodeIds }: StagedJSXPreview,
  signal: AbortSignal
): Promise<SkPicture | null> {
  renderer.pageId = pageId
  await renderer.prepareForExport(graph, pageId, nodeIds)
  signal.throwIfAborted()
  const bounds = computeDescendantVisualBounds(
    nodeIds,
    (id) => graph.getNode(id),
    (id) => graph.getAbsolutePosition(id)
  )
  if (!bounds || !fitsPreview(bounds)) return null
  return recordWorldPicture(renderer, bounds, (canvas) => {
    for (const id of nodeIds) renderer.renderNode(canvas, graph, id, {})
  })
}

export interface JSXPreviewRecorder {
  /** Record `staged` as a picture the caller owns, even when its request becomes stale. */
  record(staged: StagedJSXPreview, signal: AbortSignal): Promise<SkPicture | null>
  /** Free the private renderer once the records already asked for finish. */
  destroy(): void
}

/**
 * A private renderer that records preview pictures one at a time, for previews of JSX that is
 * still streaming. Each record draws a new graph, so only what identical text shaped to carries
 * over: a preview that grows measures just its new text instead of all of it again. Neither
 * speculative nodes nor renderer caches enter the live document.
 */
export function createJSXPreviewRecorder(ck: CanvasKit): JSXPreviewRecorder {
  let renderer: SkiaRenderer | null = null
  let destroyed = false
  // Records share one renderer, whose caches and page one record at a time may use.
  let queue: Promise<unknown> = Promise.resolve()

  async function rendererFor(): Promise<SkiaRenderer | null> {
    if (renderer) return renderer
    const surface = ck.MakeSurface(1, 1)
    if (!surface) return null
    const created = new SkiaRenderer(ck, surface)
    // Loading fonts drops every cache, so it happens once rather than before each record; a
    // renderer whose fonts failed to load is not kept, so the next record tries again.
    try {
      await created.loadFonts()
    } catch (error) {
      created.destroy()
      throw error
    }
    renderer = created
    return created
  }

  async function recordNext(
    staged: StagedJSXPreview,
    signal: AbortSignal
  ): Promise<SkPicture | null> {
    signal.throwIfAborted()
    const current = destroyed ? null : await rendererFor()
    if (!current) return null
    signal.throwIfAborted()
    // Layer IDs repeat between staged graphs with different content, so nothing keyed by them stays.
    current.invalidateAllPictures({ keepShapedText: true })
    return recordStaged(current, staged, signal)
  }

  return {
    record(staged, signal) {
      const result = queue.then(() => recordNext(staged, signal))
      queue = result.catch(() => undefined)
      return result
    },
    destroy() {
      destroyed = true
      const release = () => {
        renderer?.destroy()
        renderer = null
      }
      queue = queue.then(release)
    }
  }
}
