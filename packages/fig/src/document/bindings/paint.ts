import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { resolvedPaintBindings } from '@pairdraw/scene-graph/variables'

/** Resolve bound paint colors only after occurrence hierarchy and modes are available. */
export function applyDocumentPaintBindings(
  graph: SceneGraph,
  materialized: readonly SceneNode[]
): void {
  for (const node of materialized) {
    const changes = resolvedPaintBindings(graph, node)
    if (changes.fills || changes.strokes) graph.updateNode(node.id, changes)
  }
}
