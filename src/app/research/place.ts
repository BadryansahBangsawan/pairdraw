import type { DocumentKind, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { createConnector } from '@open-pencil/scene-graph/connectors'
import { createSticky, STICKY_SIZE, stickySublayers } from '@open-pencil/scene-graph/generated'
import {
  CITATION_QUOTE_LIMIT,
  readWebCitation,
  withWebCitation,
  type WebCitation
} from '@open-pencil/scene-graph/plugin-data'
import type { UndoEntry } from '@open-pencil/scene-graph/undo'

import { readOpenPageText, type OpenPageRead } from './page'
import { citationStickyText, type CitationLabels } from './text'

/** Space between a cited note and the next one. */
const GAP = 48

/** The editor surface a citation is placed on. */
export interface ResearchBoard {
  graph: SceneGraph
  state: {
    documentKind: DocumentKind
    currentPageId: string
    selectedIds: Set<string>
  }
  undo: { push(entry: UndoEntry): void }
  select(ids: string[]): void
  runLayoutForNode(id: string): void
  requestRender(): void
}

export interface CiteOnBoardInput {
  board: ResearchBoard
  /** The sticky the citation answers. The new note connects from it. */
  fromStickyId: string
  /** The open page. `url`, when set, is checked before this read is called. */
  read: OpenPageRead
  labels: CitationLabels
  /** When the page was read, as an ISO timestamp. */
  readAt: string
  /** An address to cite. A refused address places nothing. */
  url?: string | null
}

export type CiteOnBoardResult =
  | { ok: true; stickyId: string; citation: WebCitation }
  | { ok: false; error: string }

const NOT_A_BOARD = 'Research citations are placed on a board.'
const NOT_A_STICKY = 'Cite from a sticky note.'
const UNCITABLE = 'The page could not be cited.'

function endpoint(nodeId: string) {
  return { nodeId, magnet: 'AUTO' as const, position: { x: 0, y: 0 } }
}

function subtree(graph: SceneGraph, rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const walk = (id: string) => {
    const node = graph.getNode(id)
    if (!node) return
    nodes.push(structuredClone(node))
    for (const childId of node.childIds) walk(childId)
  }
  walk(rootId)
  return nodes
}

function restore(graph: SceneGraph, nodes: readonly SceneNode[]): void {
  for (const node of nodes) {
    if (graph.getNode(node.id)) continue
    const parentId = node.parentId
    if (!parentId || !graph.getNode(parentId)) continue
    const { parentId: _parentId, childIds: _childIds, type: _type, ...props } = node
    graph.createNodeWithId(node.id, node.type, parentId, props)
  }
}

function citedCount(graph: SceneGraph, pageId: string, askingId: string): number {
  return graph.getChildren(pageId).filter((node) => {
    return node.type === 'STICKY' && node.id !== askingId && readWebCitation(node) !== null
  }).length
}

/**
 * Reads the open page and places one sticky that quotes it, with the citation on the sticky and
 * a connector from the sticky that asked. A refused address places nothing. The sticky and its
 * connector are one undo step.
 */
export async function citeOnBoard(input: CiteOnBoardInput): Promise<CiteOnBoardResult> {
  const { board } = input
  if (board.state.documentKind !== 'board') return { ok: false, error: NOT_A_BOARD }
  const asking = board.graph.getNode(input.fromStickyId)
  if (asking?.type !== 'STICKY') return { ok: false, error: NOT_A_STICKY }

  const page = await readOpenPageText({ ...input.read, url: input.url ?? input.read.url })
  if (!page.ok) return page

  const citation = {
    url: page.page.url,
    title: page.page.title.trim() === '' ? page.page.url : page.page.title,
    quote: page.page.text.slice(0, CITATION_QUOTE_LIMIT).trim(),
    readAt: input.readAt
  }
  const pluginData = withWebCitation({ pluginData: [] }, citation)
  if (!pluginData) return { ok: false, error: UNCITABLE }
  const stored = readWebCitation({ pluginData })
  if (!stored) return { ok: false, error: UNCITABLE }

  const pageId = asking.parentId ?? board.state.currentPageId
  const x =
    asking.x + asking.width + GAP + citedCount(board.graph, pageId, asking.id) * (STICKY_SIZE + GAP)
  const previous = new Set(board.state.selectedIds)
  const sticky = createSticky(
    board.graph,
    pageId,
    { text: citationStickyText(stored, input.labels) },
    { x, y: asking.y, name: stored.title, pluginData }
  )
  const connector = createConnector(board.graph, pageId, {
    start: endpoint(asking.id),
    end: endpoint(sticky.id),
    startCap: 'NONE',
    endCap: 'ARROW_LINES'
  })
  board.runLayoutForNode(sticky.id)
  board.runLayoutForNode(connector.id)

  const roots = [sticky.id, connector.id]
  const snapshots = roots.map((id) => subtree(board.graph, id))
  board.undo.push({
    label: 'Cite page',
    forward() {
      for (const nodes of snapshots) restore(board.graph, nodes)
      board.select([sticky.id])
      board.requestRender()
    },
    inverse() {
      for (const id of roots.toReversed()) board.graph.deleteNode(id)
      board.select([...previous])
      board.requestRender()
    }
  })
  board.select([sticky.id])
  board.requestRender()
  // Layout may rebuild the body. The quote has to remain characters on that body.
  const body = stickySublayers(board.graph, sticky)?.body
  if (body && !body.text.includes(stored.quote)) {
    board.graph.updateNode(body.id, { text: citationStickyText(stored, input.labels) })
  }
  return { ok: true, stickyId: sticky.id, citation: stored }
}
