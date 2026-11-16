import type { ViewportTransform } from '@pairdraw/core/geometry'
import type { SceneGraph } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'

/** A rectangle on the stage, in CSS pixels from its top-left corner. */
export interface StageRect {
  left: number
  top: number
  width: number
  height: number
}

/** A layer's rectangle on the stage, following the canvas's pan and zoom; null once it is gone. */
export function nodeStageRect(
  graph: SceneGraph,
  nodeId: string,
  viewport: ViewportTransform
): StageRect | null {
  const node = graph.getNode(nodeId)
  if (!node) return null
  const bounds = getAxisAlignedWorldBounds(node, graph)
  const { panX, panY, zoom } = viewport
  return {
    left: bounds.x * zoom + panX,
    top: bounds.y * zoom + panY,
    width: bounds.width * zoom,
    height: bounds.height * zoom
  }
}

/**
 * The parts of the stage around the slide, which the presentation blacks out so neighbouring
 * layers neither show nor take clicks: above, below, and either side of it.
 */
export function letterboxRects(slide: StageRect, stage: { width: number; height: number }) {
  const left = Math.min(Math.max(Math.round(slide.left), 0), stage.width)
  const top = Math.min(Math.max(Math.round(slide.top), 0), stage.height)
  const right = Math.min(Math.max(Math.round(slide.left + slide.width), left), stage.width)
  const bottom = Math.min(Math.max(Math.round(slide.top + slide.height), top), stage.height)
  return [
    { left: 0, top: 0, width: stage.width, height: top },
    { left: 0, top: bottom, width: stage.width, height: stage.height - bottom },
    { left: 0, top, width: left, height: bottom - top },
    { left: right, top, width: stage.width - right, height: bottom - top }
  ].filter((rect) => rect.width > 0 && rect.height > 0)
}
