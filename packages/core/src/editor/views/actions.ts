import type { EditorContext } from '#core/editor/types'

import {
  createPresentationActions,
  returnFromPresentation,
  type PresentationViewport
} from './present'
import { EDIT_VIEW, resolveEditorProfile } from './profile'
import { createShaderModeActions } from './shader'
import type { CanvasView } from './types'

export function createCanvasViewActions(ctx: EditorContext, viewport: PresentationViewport) {
  function setCanvasView(view: CanvasView): void {
    const left = ctx.state.canvasView
    ctx.state.canvasView = view
    // However a presentation is left, the canvas returns to where it looked before it.
    if (left.id === 'present' && view.id !== 'present') returnFromPresentation(ctx, left, viewport)
    ctx.requestRepaint()
  }

  /** Leaves the canvas's view for the one it returns to; false when there is none to leave. */
  function leaveCanvasView(): boolean {
    const target = resolveEditorProfile(ctx.state).leaveTo
    if (!target) return false
    setCanvasView(target)
    return true
  }

  /** Preview this canvas: layers holding controls run as live components. */
  function startPlay(): void {
    if (ctx.state.canvasView.id === 'play') return
    ctx.state.hoveredNodeId = null
    setCanvasView({ id: 'play', revision: 0 })
  }

  /** Go back to editing; the canvas draws every layer again. */
  function stopPlay(): void {
    if (ctx.state.canvasView.id === 'play') setCanvasView(EDIT_VIEW)
  }

  function togglePlay(): void {
    if (ctx.state.canvasView.id === 'play') stopPlay()
    else startPlay()
  }

  /** Put every control back as designed by running the islands afresh. */
  function resetPlay(): void {
    const view = ctx.state.canvasView
    if (view.id === 'play') ctx.state.canvasView = { id: 'play', revision: view.revision + 1 }
  }

  // Another document's layers start from their designed state, not from the old islands'.
  ctx.onEditorEvent('graph:replaced', resetPlay)

  const presentation = createPresentationActions(ctx, viewport, setCanvasView)
  const shaderMode = createShaderModeActions(ctx, setCanvasView)

  return {
    leaveCanvasView,
    startPlay,
    stopPlay,
    togglePlay,
    resetPlay,
    ...presentation,
    ...shaderMode
  }
}
