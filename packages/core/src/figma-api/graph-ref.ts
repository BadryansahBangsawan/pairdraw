import type { SceneGraph } from '@pairdraw/scene-graph'

const rawByProxy = new WeakMap<SceneGraph, SceneGraph>()

/** Remembers the raw graph behind a read-freshening proxy, so pending work keyed by the raw graph is found. */
export function registerFreshGraph(proxy: SceneGraph, graph: SceneGraph): void {
  rawByProxy.set(proxy, graph)
}

/** The graph pending layout and instance sync are recorded on. */
export function underlyingGraph(graph: SceneGraph): SceneGraph {
  return rawByProxy.get(graph) ?? graph
}
