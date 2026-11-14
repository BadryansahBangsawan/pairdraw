import * as v from 'valibot'

import { sceneNodeToJSX } from '@pairdraw/design-jsx'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { graphFromPageSnapshot } from '#core/editor/history/snapshot/graph'
import { snapshotPage, type PageSnapshot } from '#core/editor/history/snapshot/page'
import { findPageId } from '#core/io/subgraph'
import { defineTool } from '#core/tools/schema'

import { formatOperations } from './format'
import { deltaOperations, type DiffOperation } from './operations'
import { diffProjections, projectTree } from './projection'

/** Edits between two states of one tree, matching nodes by ID. */
function treeChanges(baseline: SceneGraph, graph: SceneGraph, rootId: string): DiffOperation[] {
  const before = projectTree(baseline, rootId, { match: 'id' })
  const after = projectTree(graph, rootId, { match: 'id' })
  if (!before || !after) return []
  return deltaOperations(diffProjections(before, after), before, after, (id) =>
    sceneNodeToJSX(id, graph)
  )
}

/**
 * Edits to one node. A node the run added or removed exists on one side only, so its
 * parent is compared instead, keeping the edits that add or remove it.
 */
function nodeChanges(
  baseline: SceneGraph,
  graph: SceneGraph,
  id: string,
  pageId: string
): DiffOperation[] {
  if (baseline.getNode(id) && graph.getNode(id)) return treeChanges(baseline, graph, id)
  const parentId = (graph.getNode(id) ?? baseline.getNode(id))?.parentId
  const rootId =
    parentId && baseline.getNode(parentId) && graph.getNode(parentId) ? parentId : pageId
  const added = graph.getNode(id) ? sceneNodeToJSX(id, graph) : null
  return treeChanges(baseline, graph, rootId).filter((operation) =>
    operation.kind === 'add' ? added !== null && operation.jsx.includes(added) : operation.id === id
  )
}

/**
 * Pages marked with `diff_changes` `mark`, by document, for callers outside an AI chat run, such
 * as MCP clients, which have no run to compare with. Each call builds a new `figma`, so the marks
 * live with the document's graph.
 */
const marks = new WeakMap<SceneGraph, Map<string, PageSnapshot>>()

function markedBaseline(graph: SceneGraph, pageId: string): SceneGraph | null {
  const snapshot = marks.get(graph)?.get(pageId)
  return snapshot ? graphFromPageSnapshot(graph, snapshot) : null
}

export const diffChanges = defineTool({
  name: 'diff_changes',
  description:
    'Patch of what changed: a node, or the whole current page, compared with its page before an AI chat run first edited it or, elsewhere, when diff_changes was last called with mark: true. Call it with mark: true first to record the page as it is now, then later to see what you or the designer changed since. Same format as diff_create, matching nodes by ID, so diff_apply can replay it on the starting state. Use it before reporting to confirm that only the intended layers changed.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({
    id: v.optional(
      v.pipe(v.string(), v.description('Node to compare (default: the current page)'))
    ),
    mark: v.optional(
      v.pipe(
        v.boolean(),
        v.description(
          'Record the page as it is now as the starting point of later calls, instead of comparing'
        )
      )
    )
  }),
  execute: (figma, args) => {
    const targetId = args.id ?? figma.currentPage.id
    // A node is compared with its own page's baseline; a removed one is looked up on this page.
    const pageId = args.id
      ? (findPageId(figma.graph, args.id) ?? figma.currentPage.id)
      : figma.currentPage.id
    if (args.mark) {
      if (figma.changeBaseline) {
        return { error: 'An AI chat run compares with the page before the run edited it' }
      }
      if (!figma.graph.getNode(targetId)) return { error: `Node "${targetId}" not found` }
      const pages = marks.get(figma.graph) ?? new Map<string, PageSnapshot>()
      pages.set(pageId, snapshotPage(figma.graph, pageId))
      marks.set(figma.graph, pages)
      return { marked: pageId, message: 'Later calls show changes to this page since now' }
    }
    const baseline = figma.changeBaseline
      ? figma.changeBaseline(pageId)
      : markedBaseline(figma.graph, pageId)
    if (!baseline) {
      return figma.changeBaseline
        ? { diff: null, message: 'This run has not changed that page' }
        : { diff: null, message: 'Nothing to compare with yet: call diff_changes with mark: true' }
    }
    if (!baseline.getNode(targetId) && !figma.graph.getNode(targetId)) {
      return { error: `Node "${targetId}" not found` }
    }
    const operations =
      targetId === pageId
        ? treeChanges(baseline, figma.graph, pageId)
        : nodeChanges(baseline, figma.graph, targetId, pageId)
    return operations.length === 0
      ? { diff: null, message: 'No differences found' }
      : { diff: formatOperations(operations) }
  }
})
