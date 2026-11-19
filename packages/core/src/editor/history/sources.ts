import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

/** A node's source metadata as it stood at one point, by node id. */
export type SourceSnapshots = Map<string, SceneNode['source']>

/**
 * The source marks of these layers. A recorded edit restores them with the values it restores,
 * so undoing the last edit leaves a layer as it was, its edited-field marks included.
 */
export function captureSources(graph: SceneGraph, ids: Iterable<string>): SourceSnapshots {
  const sources: SourceSnapshots = new Map()
  for (const id of ids) {
    const node = graph.getNode(id)
    if (node) sources.set(id, structuredClone(node.source))
  }
  return sources
}

/** Puts the marks back without touching values, so the graph does not mark them again. */
export function restoreSources(graph: SceneGraph, sources: SourceSnapshots | undefined): void {
  if (!sources) return
  graph.preserveSourceMetadataDuring(() => {
    for (const [id, source] of sources) graph.restoreNodeProperties(id, { source }, [])
  })
}
