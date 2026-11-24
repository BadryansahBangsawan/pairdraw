import type { SceneGraph } from '@pairdraw/scene-graph'

import { registerFreshGraph, underlyingGraph } from './graph-ref'
import { flushPendingLayout } from './pending-layout'

/**
 * The graph reads that must see every edit recorded before them. A read added to SceneGraph and not
 * to this list stays stale, so add it here; `satisfies` catches a rename.
 * `getChildren` pays a flush plus an array per call, so a tool looping parents over children should
 * take the raw graph once and read that.
 */
const FRESH_READS = new Set<PropertyKey>([
  'getNode',
  'getChildren',
  'getPages',
  'getAllNodes',
  'flattenTree',
  'closest',
  'getAbsolutePosition',
  'pageOf'
] satisfies (keyof SceneGraph)[])

const freshGraphs = new WeakMap<SceneGraph, SceneGraph>()

/**
 * Lays out and syncs the edits recorded since the last read, then runs `read`. One seam for every
 * surface that reads the graph, so no caller has to flush first.
 */
export function freshRead<T>(graph: SceneGraph, read: () => T): T {
  flushPendingLayout(underlyingGraph(graph))
  return read()
}

/**
 * The graph as read surfaces see it. A read lays out pending edits first; a write goes straight
 * through, and the writer decides whether an edit depends on a fresh layout.
 */
export function freshReadGraph(graph: SceneGraph): SceneGraph {
  const cached = freshGraphs.get(graph)
  if (cached) return cached
  const methods = new Map<PropertyKey, (...args: never[]) => unknown>()
  const proxy = new Proxy(graph, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)
      if (!FRESH_READS.has(property) || typeof value !== 'function') return value
      let method = methods.get(property)
      if (!method) {
        method = (...args: never[]) => freshRead(target, () => value.apply(target, args))
        methods.set(property, method)
      }
      return method
    }
  })
  freshGraphs.set(graph, proxy)
  registerFreshGraph(proxy, graph)
  return proxy
}
