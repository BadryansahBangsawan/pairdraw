import type { SceneNode } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { LAYER_HIT_PAD } from '#core/constants'
import type { EditorContext } from '#core/editor/types'

export function createSelectionHitTestActions(
  ctx: EditorContext,
  select: (ids: string[], additive?: boolean) => void,
  clearSelection: () => void
) {
  function hitTestAtPoint(cx: number, cy: number, deep = false): SceneNode | null {
    const renderer = ctx.getRenderer()
    if (!renderer) return null
    const pad = LAYER_HIT_PAD / ctx.state.zoom
    const scopeId = ctx.state.enteredContainerId
    if (scopeId && !ctx.graph.getNode(scopeId)) ctx.state.enteredContainerId = null
    const scope = ctx.state.enteredContainerId ?? ctx.state.currentPageId
    return deep
      ? ctx.graph.hitTestDeep(cx, cy, scope, pad)
      : ctx.graph.hitTestSelectable(cx, cy, scope, ctx.state.selectedIds, pad)
  }

  /**
   * A name drawn on a pane's overlay canvas, in draw order: a component's label, then a section
   * title, then a frame title. A right-click hits a locked layer's name as it hits its body.
   */
  function labelAt(renderer: SkiaRenderer, cx: number, cy: number): SceneNode | null {
    const preview = ctx.state.rotationPreview
    const graph = ctx.graph
    const filter = { locked: true }
    if (typeof renderer.hitTestComponentLabel === 'function') {
      const component = renderer.hitTestComponentLabel(graph, cx, cy, preview, filter)
      if (component) return component
    }
    if (typeof renderer.hitTestSectionTitle === 'function') {
      const section = renderer.hitTestSectionTitle(graph, cx, cy, preview, filter)
      if (section) return section
    }
    return typeof renderer.hitTestFrameTitle === 'function'
      ? renderer.hitTestFrameTitle(graph, cx, cy, preview, filter)
      : null
  }

  /**
   * Selects what a right-click is over, as Figma does: the layer a click would select, or else the
   * frame or section whose empty area is under the point, which a click leaves for a marquee. A
   * name above a frame, section, or component is part of that layer, read from `renderer` (the
   * pane's overlay canvas; the editor's current canvas when omitted).
   */
  function selectAtPoint(cx: number, cy: number, renderer?: SkiaRenderer | null) {
    const labels = renderer === undefined ? ctx.getRenderer() : renderer
    const scopeId = ctx.state.enteredContainerId ?? ctx.state.currentPageId
    const hit =
      (labels ? labelAt(labels, cx, cy) : null) ??
      hitTestAtPoint(cx, cy) ??
      ctx.graph.hitTestOpenContainer(cx, cy, scopeId)
    if (hit) {
      if (!ctx.state.selectedIds.has(hit.id)) select([hit.id])
    } else {
      clearSelection()
    }
  }

  return { hitTestAtPoint, selectAtPoint }
}
