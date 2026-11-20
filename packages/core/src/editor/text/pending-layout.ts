import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { isNodeFontLoaded, nodeFontReadiness } from '#core/canvas/text'
import { sizeAutoResizingText } from '#core/layout/text-auto-resize'
import { collectNodeFontFaces } from '#core/text/requirements/collect'

export type PendingLayoutRenderer = Pick<SkiaRenderer, 'measureTextNode' | 'fontsLoaded'> &
  Partial<Pick<SkiaRenderer, 'nodeFontReadiness'>> &
  Parameters<typeof isNodeFontLoaded>[0]

interface PendingTextLayoutContext {
  getGraph: () => SceneGraph
  runLayoutForNode: (id: string) => void
  requestRender: () => void
  /** Whether the renderer can measure this layer with its own faces. */
  isReady?: (renderer: PendingLayoutRenderer, node: SceneNode) => boolean
}

function facesLoaded(renderer: PendingLayoutRenderer, node: SceneNode): boolean {
  return renderer.fontsLoaded && isNodeFontLoaded(renderer, node)
}

/** The renderer's own readiness report when it has one, else the faces it can observe. */
function readinessOf(renderer: PendingLayoutRenderer, node: SceneNode) {
  return renderer.nodeFontReadiness
    ? renderer.nodeFontReadiness(node)
    : nodeFontReadiness(renderer, node)
}

/**
 * Text measured before its face loaded is laid out with an estimate. Remember those layers and,
 * once their faces settle, measure them again and lay out the frames around them, so auto-sized
 * text takes its real size wherever it sits, without adding an undo step. Layout of the
 * document's own state stays derived.
 */
export function createPendingTextLayout(ctx: PendingTextLayoutContext) {
  /** Layer id → whether it was measured while laying out the document's own state. */
  const pending = new Map<string, boolean>()
  /** Text measured in the substitute for a face found nowhere, laid out again when its family loads. */
  const substituted = new Map<string, boolean>()
  const ready = ctx.isReady ?? facesLoaded

  function measure(renderer: PendingLayoutRenderer, node: SceneNode, maxWidth?: number) {
    const size = renderer.measureTextNode(node, maxWidth)
    const graph = ctx.getGraph()
    if (!size && node.type === 'TEXT' && node.text && !ready(renderer, node)) {
      pending.set(node.id, (pending.get(node.id) ?? true) && graph.isApplyingDerivedLayout)
    } else if (size && readinessOf(renderer, node) === 'substituted') {
      substituted.set(node.id, graph.isApplyingDerivedLayout)
    } else if (size) substituted.delete(node.id)
    return size
  }

  function relayoutReady(renderer: PendingLayoutRenderer | null) {
    if (!renderer || pending.size === 0) return
    const graph = ctx.getGraph()
    const edited: string[] = []
    const derived: string[] = []
    for (const [id, isDerived] of pending) {
      const node = graph.getNode(id)
      if (node && !ready(renderer, node)) continue
      pending.delete(id)
      if (node) (isDerived ? derived : edited).push(id)
    }
    if (edited.length === 0 && derived.length === 0) return
    // Layout measures text only in auto layout; text that sizes itself is measured here,
    // unless it keeps the glyphs its file saved, whose size is the file's.
    const relayout = (id: string) => {
      if (!graph.getNode(id)?.derivedTextGlyphs?.length) sizeAutoResizingText(graph, id)
      ctx.runLayoutForNode(id)
    }
    if (derived.length > 0) graph.applyDerivedLayoutDuring(() => derived.forEach(relayout))
    edited.forEach(relayout)
    ctx.requestRender()
  }

  /** Lays the text measured in a substitute out again whose runs name `family`, which loaded. */
  function relayoutSubstituted(renderer: PendingLayoutRenderer | null, family: string) {
    if (!renderer) return
    const graph = ctx.getGraph()
    for (const [id, derived] of substituted) {
      const node = graph.getNode(id)
      if (!node) {
        substituted.delete(id)
        continue
      }
      if (!collectNodeFontFaces(node).some((face) => face.family === family)) continue
      substituted.delete(id)
      pending.set(id, derived)
    }
    relayoutReady(renderer)
  }

  return {
    measure,
    relayoutReady,
    relayoutSubstituted,
    clear: () => {
      pending.clear()
      substituted.clear()
    }
  }
}
