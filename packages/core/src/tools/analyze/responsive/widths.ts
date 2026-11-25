import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import { extractExportGraph } from '#core/io/subgraph'
import { computeLayout, sizeAutoResizingText } from '#core/layout'

/** The narrower widths a responsive frame is rendered at, when they fit under its own. */
const NARROW_WIDTHS = [375, 768] as const

/** Below this a narrow render says nothing a phone-sized frame has not already shown. */
const MIN_NARROW_WIDTH = 240

/** A layout that misses the requested width by more than this was clamped, not reflowed. */
const CLAMP_TOLERANCE = 1

export interface FrameAtWidth {
  /** A copy holding only the frame's subtree, laid out at `requested`. */
  graph: SceneGraph
  pageId: string
  frame: SceneNode
  /** The width the copy was asked for, rounded. */
  requested: number
  /** Whether the frame's own min or max width moved it away from `requested`. */
  clamped: boolean
}

/**
 * The narrower widths to render a frame at: 375 and 768, each kept only when it is narrower
 * than the frame and wide enough to be worth a render. Rounded, so a fractional width compares
 * as its whole pixels.
 */
export function widthVariants(frameWidth: number): number[] {
  const own = Math.round(frameWidth)
  return NARROW_WIDTHS.filter((width) => width >= MIN_NARROW_WIDTH && width < own)
}

/**
 * A copy of the frame and its subtree laid out at `width`, with auto-resizing text sized for it.
 * The input graph is not touched. `clamped` reports that the frame's own min or max width held
 * it away from the requested width, so a caller can drop a render it cannot label honestly.
 */
export function layoutFrameAtWidth(
  graph: SceneGraph,
  pageId: string,
  frameId: string,
  width: number
): FrameAtWidth | null {
  const extracted = extractExportGraph(graph, { scope: 'node', nodeId: frameId })
  const copy = extracted.graph
  if (!copy.getNode(frameId)) return null
  const requested = Math.max(1, Math.round(width))
  copy.updateNode(frameId, { width: requested })
  sizeAutoResizingText(copy, frameId)
  computeLayout(copy, frameId)
  const frame = copy.getNode(frameId)
  if (!frame) return null
  return {
    graph: copy,
    pageId: extracted.pageId ?? pageId,
    frame,
    requested,
    clamped: Math.abs(frame.width - requested) > CLAMP_TOLERANCE
  }
}
