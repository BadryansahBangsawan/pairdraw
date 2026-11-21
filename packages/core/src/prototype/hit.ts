import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  clippingMasks,
  isPointInNode,
  isPointMaskedOut,
  showsPaint
} from '@pairdraw/scene-graph/hit-test'
import { drawnChildIds } from '@pairdraw/scene-graph/layout'
import type { Vector } from '@pairdraw/scene-graph/primitives'

const NOT_SCROLLED: ReadonlyMap<string, Vector> = new Map()

/** Every layer may take the pointer. */
const ANY_LAYER = (): boolean => true

/**
 * The deepest layer under a point inside `rootId` that takes the pointer, as a prototype finds
 * it: one `takes` accepts, over its whole box, so a button's background takes its click as its
 * label does, and one that shows a paint there, so a filled sheet laid over a button keeps the
 * click from it. A layer that does neither, such as an unfilled frame laid over a screen, lets
 * the pointer through to what lies under it. A clipping frame and a mask hide what lies outside
 * them; hidden layers and masks take nothing. The root itself when no layer takes the point and
 * it lies over the root, and null outside it. A frame play scrolled finds its layers where they
 * are drawn, `scroll` offsets in.
 */
export function playHitTest(
  graph: SceneGraph,
  rootId: string,
  x: number,
  y: number,
  scroll: ReadonlyMap<string, Vector> = NOT_SCROLLED,
  takes: (node: SceneNode) => boolean = ANY_LAYER
): SceneNode | null {
  const root = graph.getNode(rootId)
  if (!root) return null
  const hit = deepestIn(graph, root, x, y, scroll, takes)
  return hit ?? (isPointInNode(graph, rootId, x, y) ? root : null)
}

function deepestIn(
  graph: SceneGraph,
  parent: SceneNode,
  x: number,
  y: number,
  scroll: ReadonlyMap<string, Vector>,
  takes: (node: SceneNode) => boolean
): SceneNode | null {
  if (parent.clipsContent && !isPointInNode(graph, parent.id, x, y)) return null
  // The layers of a scrolled frame are drawn moved up and left by its offset.
  const offset = scroll.get(parent.id)
  const innerX = x + (offset?.x ?? 0)
  const innerY = y + (offset?.y ?? 0)
  const drawn = drawnChildIds(parent)
  const masks = clippingMasks(graph, drawn)
  for (let index = drawn.length - 1; index >= 0; index--) {
    const child = graph.getNode(drawn[index])
    if (!child?.visible || child.internalOnly || child.isMask) continue
    if (isPointMaskedOut(graph, masks[index], innerX, innerY)) continue
    const hit = deepestIn(graph, child, innerX, innerY, scroll, takes)
    if (hit) return hit
    const captures = takes(child) || showsPaint(child)
    if (captures && isPointInNode(graph, child.id, innerX, innerY)) return child
  }
  return null
}
