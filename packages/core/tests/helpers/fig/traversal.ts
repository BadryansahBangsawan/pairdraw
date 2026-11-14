import type { NodeType, SceneGraph, SceneNode } from '@pairdraw/scene-graph'

export function collectAllNodes(graph: SceneGraph): SceneNode[] {
  const all: SceneNode[] = []
  function walk(id: string) {
    const node = graph.getNode(id)
    if (!node) return
    all.push(node)
    for (const child of graph.getChildren(id)) {
      walk(child.id)
    }
  }
  for (const page of graph.getPages()) {
    for (const child of graph.getChildren(page.id)) {
      walk(child.id)
    }
  }
  return all
}

export function countByType(nodes: SceneNode[]): Map<NodeType, number> {
  const counts = new Map<NodeType, number>()
  for (const node of nodes) {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1)
  }
  return counts
}
