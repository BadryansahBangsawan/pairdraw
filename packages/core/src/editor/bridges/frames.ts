import type { SceneGraph, SceneNode, NodeType } from '@pairdraw/scene-graph'

import type { createSelectionActions } from '#core/editor/selection'
import type { EditorContext } from '#core/editor/types'
import type { createViewportActions } from '#core/editor/viewport'

type SelectionActions = ReturnType<typeof createSelectionActions>
type ViewportActions = ReturnType<typeof createViewportActions>

const FRAME_TYPES = new Set<NodeType>(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

/**
 * The page's slides: its visible top-level frames, including frames placed in its sections, in
 * the page's layer order, bottom layer first. Present shows them in this order, and the app's
 * slide exports (PDF and PowerPoint) pass these ids in this order as their selection; the
 * generic page- and selection-scoped PPTX export does not consult it.
 */
export function pageSlides(graph: SceneGraph, pageId: string): SceneNode[] {
  return graph.getChildren(pageId).flatMap((node) => {
    if (!node.visible) return []
    if (node.type === 'SECTION') return pageSlides(graph, node.id)
    return FRAME_TYPES.has(node.type) ? [node] : []
  })
}

/** Where a slide dropped before or after another one goes: its parent and index there. */
export interface SlideMoveTarget {
  parentId: string
  /** The index among the parent's children, counted without the moved slide. */
  index: number
}

/**
 * Where moving `slideId` before or after `targetId` puts it among the target's siblings, so the
 * slide lands next to the target in the page's slide order; null when the move changes nothing
 * or either is not a slide of the page.
 */
export function slideMoveTarget(
  graph: SceneGraph,
  pageId: string,
  slideId: string,
  targetId: string,
  place: 'before' | 'after'
): SlideMoveTarget | null {
  if (slideId === targetId) return null
  const slides = pageSlides(graph, pageId)
  const from = slides.findIndex((slide) => slide.id === slideId)
  const to = slides.findIndex((slide) => slide.id === targetId)
  if (from === -1 || to === -1) return null
  if (place === 'before' ? to === from + 1 : to === from - 1) return null
  const target = slides[to]
  const parentId = target.parentId ?? pageId
  const siblings = (graph.getNode(parentId)?.childIds ?? []).filter((id) => id !== slideId)
  const targetIndex = siblings.indexOf(targetId)
  if (targetIndex === -1) return null
  return { parentId, index: place === 'before' ? targetIndex : targetIndex + 1 }
}

/**
 * Figma's N and Shift+N: zoom to the next or previous top-level frame, including frames placed
 * in sections. Frames go left to right, then top to bottom, the order Figma documents for them.
 */
export function createFrameNavigationBridge(
  ctx: EditorContext,
  selection: SelectionActions,
  viewport: ViewportActions
) {
  function zoomToAdjacentFrame(step: 1 | -1) {
    const frames = pageSlides(ctx.graph, ctx.state.currentPageId)
      .map((node) => ({ node, position: ctx.graph.getAbsolutePosition(node.id) }))
      .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
      .map(({ node }) => node)
    if (frames.length === 0) return
    const ids = new Set(frames.map((frame) => frame.id))
    const [selectedId] = ctx.state.selectedIds
    const current = selectedId
      ? ctx.graph.closest(selectedId, (node) => ids.has(node.id))
      : undefined
    // Without a frame selected, next starts at the first frame and previous at the last.
    const start = step > 0 ? -1 : frames.length
    const index = current ? frames.findIndex((frame) => frame.id === current.id) : start
    const target = frames[(index + step + frames.length) % frames.length]
    selection.select([target.id])
    viewport.zoomToSelection()
  }

  return {
    zoomToNextFrame: () => zoomToAdjacentFrame(1),
    zoomToPreviousFrame: () => zoomToAdjacentFrame(-1)
  }
}
