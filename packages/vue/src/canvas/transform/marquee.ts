import type { Editor } from '@open-pencil/core'
import { getAxisAlignedWorldBounds } from '@open-pencil/scene-graph/coordinate'
import { hitTestDeepInRect } from '@open-pencil/scene-graph/hit-test'
import type { Rect } from '@open-pencil/scene-graph/primitives'

import { isPastPointerDragThreshold } from '#vue/shared/input/drag-threshold'
import type { DragMarquee } from '#vue/shared/input/types'

function intersects(a: Rect, b: Rect) {
  return a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height
}

function encloses(outer: Rect, inner: Rect) {
  return (
    inner.x >= outer.x &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y >= outer.y &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

/** Whether the selection already holds exactly these layers, so an unchanged move selects nothing. */
function selects(editor: Editor, ids: readonly string[]) {
  const selected = editor.state.selectedIds
  return selected.size === ids.length && ids.every((id) => selected.has(id))
}

/**
 * The scope's own children the marquee touches, compared by their canvas bounds so rotated layers
 * and containers match what is drawn. As in Figma, on the page a frame or section holding layers
 * needs to be fully enclosed.
 */
function childrenInMarquee(editor: Editor, marquee: Rect, parentId: string, onPage: boolean) {
  const hits: string[] = []
  for (const node of editor.graph.getChildren(parentId)) {
    if (!node.visible || node.locked) continue
    const bounds = getAxisAlignedWorldBounds(node, editor.graph)
    const enclose = onPage && editor.graph.isOpenContainer(node.id)
    if (enclose ? encloses(marquee, bounds) : intersects(marquee, bounds)) hits.push(node.id)
  }
  return hits
}

/**
 * Selects the layers the marquee touches. With `deep` (⌘ or Ctrl held, checked on every move as
 * in Figma) it selects the deepest nested layers instead of the scope's own children.
 */
export function handleMarqueeMove(
  editor: Editor,
  d: DragMarquee,
  cx: number,
  cy: number,
  deep = false
) {
  const marquee = {
    x: Math.min(d.startX, cx),
    y: Math.min(d.startY, cy),
    width: Math.abs(cx - d.startX),
    height: Math.abs(cy - d.startY)
  }

  const scopeId = d.containerId ?? editor.state.enteredContainerId
  const parentId = scopeId ?? editor.state.currentPageId
  const hits = deep
    ? hitTestDeepInRect(editor.graph, marquee, parentId).map((node) => node.id)
    : childrenInMarquee(editor, marquee, parentId, !scopeId)

  if (!selects(editor, hits)) editor.select(hits)
  editor.setMarquee(marquee)
}

/**
 * Ends a marquee. A click without a drag selects the layer it was pressed on (see `selectOnClick`),
 * or a section whose empty area it pressed, as in Figma.
 */
export function finishMarquee(editor: Editor, d: DragMarquee) {
  const container = d.containerId ? editor.graph.getNode(d.containerId) : undefined
  const marquee = editor.state.marquee
  const zoom = editor.state.zoom
  const dragged =
    !!marquee && isPastPointerDragThreshold(0, 0, marquee.width * zoom, marquee.height * zoom)
  if (!dragged && d.selectOnClick && editor.graph.getNode(d.selectOnClick))
    editor.select([d.selectOnClick])
  else if (!dragged && container?.type === 'SECTION') editor.select([container.id])
  editor.setMarquee(null)
}
