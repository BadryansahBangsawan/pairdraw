import type { SceneGraph } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { withWorldViewport } from '#core/canvas/renderer/picture'

/**
 * A frame as play shows it, drawn to a PNG: from `graph`, play's copy of a frame it changed, with
 * the offsets play scrolled its frames by. The canvas may be one another pane edits with, so the
 * drawings it keeps by id for the layers play changed (`touched`) are dropped before and after,
 * and neither the snapshot nor that canvas shows the other's version of them. Null when the frame
 * cannot be drawn.
 */
export function snapshotPlayFrame(
  renderer: SkiaRenderer,
  graph: SceneGraph,
  frameId: string,
  options: { scale: number; scroll?: ReadonlyMap<string, Vector>; touched?: Iterable<string> }
): Uint8Array<ArrayBuffer> | null {
  const frame = graph.getNode(frameId)
  if (!frame) return null
  const bounds = getAxisAlignedWorldBounds(frame, graph)
  const width = Math.ceil(bounds.width * options.scale)
  const height = Math.ceil(bounds.height * options.scale)
  if (width <= 0 || height <= 0) return null
  const surface = renderer.ck.MakeSurface(width, height)
  if (!surface) return null
  const touched = [...(options.touched ?? [])]
  const forget = () => {
    for (const id of touched) renderer.invalidateNodePicture(id)
  }
  forget()
  try {
    const canvas = surface.getCanvas()
    canvas.clear(renderer.ck.TRANSPARENT)
    canvas.scale(options.scale, options.scale)
    canvas.translate(-bounds.x, -bounds.y)
    const area = {
      minX: bounds.x,
      minY: bounds.y,
      maxX: bounds.x + bounds.width,
      maxY: bounds.y + bounds.height
    }
    withWorldViewport(renderer, area, () =>
      renderer.renderNode(canvas, graph, frameId, { playing: true, playScroll: options.scroll })
    )
    surface.flush()
    const image = surface.makeImageSnapshot()
    try {
      const bytes = image.encodeToBytes()
      return bytes ? new Uint8Array(bytes) : null
    } finally {
      image.delete()
    }
  } finally {
    surface.delete()
    forget()
  }
}
