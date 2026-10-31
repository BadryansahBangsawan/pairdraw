import { uniq } from 'es-toolkit/array'

import type { SceneGraph } from '@pairdraw/scene-graph'

import { applyDocumentChange, type DocumentChange } from '#core/editor/history/document-change'
import { extractPageContext } from '#core/io/subgraph'

import type { PageSnapshot } from './page'

/** The variables and collections a copy reads, which copies of one state may share. */
type VariableTables = Pick<SceneGraph, 'variables' | 'variableCollections'>

function copyVariableTables(source: SceneGraph): VariableTables {
  return {
    variables: structuredClone(source.variables),
    variableCollections: structuredClone(source.variableCollections)
  }
}

function pageContext(
  source: SceneGraph,
  pageIds: string | readonly string[],
  nodeIds: readonly string[],
  tables: VariableTables = copyVariableTables(source)
): SceneGraph {
  const graph = extractPageContext(source, pageIds, nodeIds)
  graph.images = new Map(source.images)
  graph.variables = tables.variables
  graph.variableCollections = tables.variableCollections
  return graph
}

/**
 * A standalone copy of the document whose snapshot page is as it was when taken, so a past
 * state can be rendered or diffed next to the live one. Other pages are left empty.
 */
export function graphFromPageSnapshot(
  source: SceneGraph,
  snapshot: PageSnapshot
): SceneGraph | null {
  // `snapshotPage` records the page first.
  const page = snapshot.nodes.values().next().value
  if (!page || !source.getNode(page.id)) return null
  const graph = pageContext(source, page.id, [])
  graph.variables = structuredClone(snapshot.variables)
  graph.variableCollections = structuredClone(snapshot.collections)
  for (const node of snapshot.nodes.values()) graph.nodes.set(node.id, structuredClone(node))
  graph.clearAbsPosCache()
  return graph
}

/**
 * A standalone copy of the document with the pages a change touched, and the page it ran on, on
 * one side of the change. The source must be as the change left it, as it is right after the
 * edit. Other pages are left empty. `layerIds`, from `touchedTopLevelIds`, keeps only those page
 * children, each whole, with what they depend on; `tables` are variables the copy reads instead
 * of its own copy of them.
 */
export function graphFromDocumentChange(
  source: SceneGraph,
  change: DocumentChange,
  side: 'before' | 'after',
  layerIds?: readonly string[],
  tables?: VariableTables
): SceneGraph | null {
  const pageIds = uniq([change.pageId, ...change.pageIds]).filter((id) => source.getNode(id))
  // A change that removed every page it touched still needs one to build on; the past side
  // brings the removed ones back.
  const host = pageIds[0] ?? source.getPages()[0]?.id
  if (!host) return null
  // A page's own id brings its whole subtree, so a layer moved between pages can move back;
  // with `layerIds`, the pages hold only those layers.
  const graph = layerIds
    ? pageContext(source, pageIds.length > 0 ? pageIds : host, layerIds, tables)
    : pageContext(source, host, pageIds, tables)
  if (side === 'before') applyDocumentChange(graph, change, 'before')
  graph.clearAbsPosCache()
  return graph
}

/**
 * Both sides of a change as `graphFromDocumentChange` builds them. When the change left the
 * variables alone, the two copies share one copy of them; neither may change it.
 */
export function graphsFromDocumentChange(
  source: SceneGraph,
  change: DocumentChange,
  layerIds?: readonly string[]
): { before: SceneGraph; after: SceneGraph } | null {
  const shared =
    change.variables.length === 0 && change.collections.length === 0
      ? copyVariableTables(source)
      : undefined
  const before = graphFromDocumentChange(source, change, 'before', layerIds, shared)
  const after = graphFromDocumentChange(source, change, 'after', layerIds, shared)
  return before && after ? { before, after } : null
}
