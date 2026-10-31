import { diffLines, type ChangeObject } from 'diff'
import { compact, uniq } from 'es-toolkit/array'

import {
  graphsFromDocumentChange,
  isEmptyDocumentChange,
  touchedTopLevelIds,
  type DocumentChange
} from '@pairdraw/core'
import { diffPageLayersJSX } from '@pairdraw/core/tools'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { changePreviewSize } from '@/app/ai/chat/preferences'
import type { EditorStore } from '@/app/editor/active-store'
import type { ChangePreviewSize } from '@/app/settings/preferences/store'

import { changeBounds, layersInBounds } from './images'
import { queueChangePreview } from './previews'
import { setToolChange } from './store'
import type { ToolChange } from './types'

type ChangeGraphs = NonNullable<ReturnType<typeof graphsFromDocumentChange>>

/** Longer sources keep only the changed region, so the history stays small. */
const MAX_JSX_LENGTH = 40_000
/** Unchanged source kept on each side of the changed region. */
const CLIP_CONTEXT = 2_000

function joinJSX(sources: string[]): string {
  return compact(sources).join('\n\n')
}

function lineStart(text: string, index: number): number {
  return index <= 0 ? 0 : text.lastIndexOf('\n', index - 1) + 1
}

/**
 * Clips both sources to the region where they differ, plus context, so a change deep in a
 * long layer stays visible. Clipping each source from the start would cut it off.
 */
export function clipChangedJSX(before: string, after: string): [string, string] {
  if (before.length <= MAX_JSX_LENGTH && after.length <= MAX_JSX_LENGTH) return [before, after]
  // The unchanged lines before the first change and after the last one.
  const changes = diffLines(before, after)
  const unchanged = (change: ChangeObject<string> | undefined) =>
    change && !change.added && !change.removed ? change.value.length : 0
  const prefix = unchanged(changes[0])
  const suffix = changes.length > 1 ? unchanged(changes.at(-1)) : 0
  const clip = (text: string): string => {
    const from = lineStart(text, prefix - CLIP_CONTEXT)
    const to = Math.min(text.length, text.length - suffix + CLIP_CONTEXT)
    let region = text.slice(from, to)
    if (region.length > MAX_JSX_LENGTH) region = `${region.slice(0, MAX_JSX_LENGTH)}\n…`
    return `${from > 0 ? '…\n' : ''}${region}${to < text.length ? '\n…' : ''}`
  }
  return [clip(before), clip(after)]
}

/** The first page, the call's own one first, whose layers the change added, removed, or changed. */
function changedPage(
  before: SceneGraph,
  after: SceneGraph,
  change: DocumentChange,
  layerIds: readonly string[] | undefined
) {
  for (const pageId of uniq([change.pageId, ...change.pageIds])) {
    const layers = diffPageLayersJSX(before, after, pageId, layerIds)
    if (layers.length > 0) return { pageId, layers }
  }
  return null
}

/**
 * Queues the change's preview images, drawn from copies holding the changed layers and whatever
 * other layers draw into their region, so the images match the whole page's.
 */
function queuePreview(
  store: EditorStore,
  change: ToolChange,
  documentChange: DocumentChange,
  scope: { graphs: ChangeGraphs; layerIds: readonly string[] | undefined },
  size: Exclude<ChangePreviewSize, 'off'>
): void {
  let { graphs } = scope
  const bounds = changeBounds(graphs.before, graphs.after, change.nodeIds)
  if (!bounds) return
  if (scope.layerIds) {
    const shown = new Set(scope.layerIds)
    const nearby = layersInBounds(store.graph, change.pageId, bounds, shown)
    if (nearby.length > 0) {
      const wider = graphsFromDocumentChange(store.graph, documentChange, [...shown, ...nearby])
      if (wider) graphs = wider
    }
  }
  queueChangePreview(store, change, {
    beforeGraph: graphs.before,
    afterGraph: graphs.after,
    pageId: change.pageId,
    bounds,
    size
  })
}

/**
 * Records what a finished call changed, called right after it while the document is as the call
 * left it. The review shows one page: the one the call ran on when its layers changed, otherwise
 * the first other page whose layers did. Only the top-level layers the call touched are copied
 * and compared, unless that cannot be told; the structural diff is immediate, and images render
 * later, between the reply's calls, from frozen copies of both states, so later edits cannot
 * leak into them.
 */
export function recordToolChange(
  store: EditorStore,
  toolCallId: string,
  documentChange: DocumentChange
): ToolChange | null {
  if (isEmptyDocumentChange(documentChange)) return null
  const layerIds = touchedTopLevelIds(store.graph, documentChange) ?? undefined
  const graphs = graphsFromDocumentChange(store.graph, documentChange, layerIds)
  if (!graphs) return null
  // The same JSX diff `diff_jsx` returns decides which layers changed.
  const shown = changedPage(graphs.before, graphs.after, documentChange, layerIds)
  if (!shown) return null
  const { pageId, layers } = shown
  const nodeIds = layers.map((layer) => layer.id)
  const [jsxBefore, jsxAfter] = clipChangedJSX(
    joinJSX(layers.map((layer) => layer.before)),
    joinJSX(layers.map((layer) => layer.after))
  )
  const change: ToolChange = {
    toolCallId,
    pageId,
    nodeIds,
    jsx: { before: jsxBefore, after: jsxAfter }
  }
  setToolChange(change)
  const size = changePreviewSize.value
  if (size !== 'off') queuePreview(store, change, documentChange, { graphs, layerIds }, size)
  return change
}
