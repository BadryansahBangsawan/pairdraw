import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { isPointInNode } from '@pairdraw/scene-graph/hit-test'
import { drawnChildIds } from '@pairdraw/scene-graph/layout'

/**
 * The deepest layer under a point inside `rootId`, as a prototype's pointer finds it: a frame,
 * component or instance counts over its whole box, so a button's background takes its click as
 * its label does; a clipping frame hides what lies outside it; hidden layers take nothing. The
 * root itself when the point is only over its background, and null outside it.
 */
export function playHitTest(
  graph: SceneGraph,
  rootId: string,
  x: number,
  y: number
): SceneNode | null {
  const root = graph.getNode(rootId)
  if (!root) return null
  return deepestIn(graph, root, x, y) ?? (isPointInNode(graph, rootId, x, y) ? root : null)
}

function deepestIn(graph: SceneGraph, parent: SceneNode, x: number, y: number): SceneNode | null {
  if (parent.clipsContent && !isPointInNode(graph, parent.id, x, y)) return null
  const drawn = drawnChildIds(parent)
  for (let index = drawn.length - 1; index >= 0; index--) {
    const child = graph.getNode(drawn[index])
    if (!child?.visible || child.internalOnly) continue
    const hit = deepestIn(graph, child, x, y)
    if (hit) return hit
    if (isPointInNode(graph, child.id, x, y)) return child
  }
  return null
}
