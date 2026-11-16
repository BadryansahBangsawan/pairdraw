import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

/**
 * Collects the nodes `writeNode` emits. Instance subtrees are skipped because a ref writes
 * no children; an instance whose component is missing here is written as a frame instead.
 */
export function writtenNodeIds(graph: SceneGraph): Set<string> {
  const ids = new Set<string>()
  const visit = (node: SceneNode): void => {
    if (node.internalOnly) return
    ids.add(node.id)
    if (node.type === 'STICKY' || node.type === 'INSTANCE') return
    for (const child of graph.getChildren(node.id)) visit(child)
  }
  for (const page of graph.getPages()) for (const node of graph.getChildren(page.id)) visit(node)
  return ids
}
