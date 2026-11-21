import { clamp } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'
import type { Vector } from '@pairdraw/scene-graph/primitives'

const NO_SCROLL: Vector = { x: 0, y: 0 }

/**
 * Whether play scrolls a frame's content inside it: a frame, component, or instance with overflow
 * scrolling that clips, as Figma needs for a frame inside another. A rotated one does not scroll.
 */
function scrolls(node: SceneNode): boolean {
  return (
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
    node.overflowDirection !== 'NONE' &&
    node.clipsContent &&
    node.rotation === 0
  )
}

/**
 * How far play may scroll a frame's content, along the axes it scrolls: how far its visible
 * layers reach past its edge, with an auto layout's trailing padding, as Figma scrolls to it.
 */
export function scrollRange(graph: SceneGraph, nodeId: string): Vector {
  const node = graph.getNode(nodeId)
  if (!node || !scrolls(node)) return NO_SCROLL
  const frame = getAxisAlignedWorldBounds(node, graph)
  let right = 0
  let bottom = 0
  for (const child of graph.getChildren(nodeId)) {
    if (!child.visible) continue
    const bounds = getAxisAlignedWorldBounds(child, graph)
    right = Math.max(right, bounds.x + bounds.width - frame.x)
    bottom = Math.max(bottom, bounds.y + bounds.height - frame.y)
  }
  const flows = node.layoutMode !== 'NONE'
  const horizontal = node.overflowDirection === 'HORIZONTAL' || node.overflowDirection === 'BOTH'
  const vertical = node.overflowDirection === 'VERTICAL' || node.overflowDirection === 'BOTH'
  return {
    x: horizontal ? Math.max(0, right + (flows ? node.paddingRight : 0) - frame.width) : 0,
    y: vertical ? Math.max(0, bottom + (flows ? node.paddingBottom : 0) - frame.height) : 0
  }
}

/**
 * Scrolls the frames along `path`, innermost first, by as much as each can move, and passes the
 * rest outward, as a browser chains a scroll. Returns what none of them could take.
 */
export function scrollAlong(
  graph: SceneGraph,
  scroll: Map<string, Vector>,
  path: readonly string[],
  dx: number,
  dy: number
): Vector {
  let restX = dx
  let restY = dy
  for (const id of [...path].reverse()) {
    if (restX === 0 && restY === 0) break
    const range = scrollRange(graph, id)
    if (range.x === 0 && range.y === 0) continue
    const current = scroll.get(id) ?? NO_SCROLL
    const next = {
      x: clamp(current.x + restX, 0, range.x),
      y: clamp(current.y + restY, 0, range.y)
    }
    restX -= next.x - current.x
    restY -= next.y - current.y
    scroll.set(id, next)
  }
  return { x: restX, y: restY }
}

/** Keeps every offset within its frame's range, after a change resized what the frame holds. */
export function clampScroll(graph: SceneGraph, scroll: Map<string, Vector>): void {
  for (const [id, offset] of scroll) {
    if (!graph.getNode(id)) continue
    const range = scrollRange(graph, id)
    scroll.set(id, { x: Math.min(offset.x, range.x), y: Math.min(offset.y, range.y) })
  }
}
