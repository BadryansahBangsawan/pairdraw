import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import { captureNode } from './capture'

export function collectSubtrees(graph: SceneGraph, rootIds: string[]): SceneNode[] {
  const result: SceneNode[] = []
  function walk(id: string) {
    const node = graph.getNode(id)
    if (!node) return
    result.push(structuredClone(node))
    for (const childId of node.childIds) walk(childId)
  }
  for (const id of rootIds) walk(id)
  return result
}

/**
 * Copies of a layer and its layers by id, for undo to put back. Each is a `captureNode` copy,
 * not a deep clone, so deleting thousands of layers stays quick.
 */
export function snapshotSubtree(graph: SceneGraph, rootId: string): Map<string, SceneNode> {
  const index = new Map<string, SceneNode>()
  const walk = (id: string) => {
    const node = graph.getNode(id)
    if (!node) return
    index.set(id, captureNode(node))
    for (const childId of node.childIds) walk(childId)
  }
  walk(rootId)
  return index
}

/**
 * Puts a snapshot back under `parentId`, its layers in order. The layer it makes gets a copy of
 * the snapshot's child list, source metadata and override maps, which the graph edits in place,
 * so the snapshot stays as it is for the next undo or redo.
 */
export function restoreSubtree(
  graph: SceneGraph,
  snapshot: SceneNode,
  parentId: string,
  index: Map<string, SceneNode>
): void {
  const { parentId: _parentId, childIds, ...rest } = captureNode(snapshot)
  graph.createNode(snapshot.type, parentId, { ...rest, id: snapshot.id })
  for (const childId of childIds) {
    const child = index.get(childId)
    if (child) restoreSubtree(graph, child, snapshot.id, index)
  }
}
