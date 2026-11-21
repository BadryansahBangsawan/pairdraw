// The masks that clip a container's children, and whether they hide a point.
import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'
import { maskContainsPoint } from './geometry'

function isVisibleMask(node: SceneNode | undefined): node is SceneNode {
  return node !== undefined && node.visible && node.isMask
}

/**
 * The masks that clip each child, by index, as the renderer groups them (`core/canvas/masks.ts`):
 * a run of visible masks clips the layers after it up to the next visible mask. Empty when the
 * container has no visible mask.
 */
export function clippingMasks(graph: SceneGraph, childIds: readonly string[]): SceneNode[][] {
  const children = childIds.map((childId) => graph.nodes.get(childId))
  if (!children.some(isVisibleMask)) return []
  const result: SceneNode[][] = []
  let run: SceneNode[] = []
  let previousWasMask = false
  for (const child of children) {
    if (isVisibleMask(child)) {
      run = previousWasMask ? [...run, child] : [child]
      previousWasMask = true
      result.push([])
      continue
    }
    previousWasMask = false
    result.push(run)
  }
  return result
}

/** Whether the masks that clip a layer leave the point outside every one of their outlines. */
export function isMaskedOut(
  px: number,
  py: number,
  masks: readonly SceneNode[] | undefined,
  graph: SceneGraph,
  transformCache: Map<string, boolean>
): boolean {
  if (!masks) return false
  return (
    masks.length > 0 &&
    !masks.some((mask) => maskContainsPoint(px, py, mask, graph, transformCache))
  )
}

/** Whether a point lies outside every mask of a run that clips a layer, so the layer hides it. */
export function isPointMaskedOut(
  graph: SceneGraph,
  masks: readonly SceneNode[] | undefined,
  px: number,
  py: number
): boolean {
  return isMaskedOut(px, py, masks, graph, new Map())
}
