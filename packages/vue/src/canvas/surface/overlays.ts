import type { Editor } from '@pairdraw/core'
import { hitTestStatusLabels, type SkiaRenderer } from '@pairdraw/core/canvas'

import { useViewportKind } from '#vue/editor/viewport-kind/use'

export type RulerVisibilityOptions = {
  showRulers?: boolean
}

export function createRulerVisibility(options?: RulerVisibilityOptions) {
  const { isMobile } = useViewportKind()

  return function shouldShowRulers() {
    if (options?.showRulers === false) return false
    return !isMobile.value
  }
}

export function createCanvasHitTests(editor: Editor, getRenderer: () => SkiaRenderer | null) {
  function hitTestSectionTitle(canvasX: number, canvasY: number) {
    return (
      getRenderer()?.hitTestSectionTitle(
        editor.graph,
        canvasX,
        canvasY,
        editor.state.rotationPreview
      ) ?? null
    )
  }

  function hitTestComponentLabel(canvasX: number, canvasY: number) {
    return (
      getRenderer()?.hitTestComponentLabel(
        editor.graph,
        canvasX,
        canvasY,
        editor.state.rotationPreview
      ) ?? null
    )
  }

  function hitTestFrameTitle(canvasX: number, canvasY: number) {
    return (
      getRenderer()?.hitTestFrameTitle(
        editor.graph,
        canvasX,
        canvasY,
        editor.state.rotationPreview
      ) ?? null
    )
  }

  /** Status pill or dot under a point in canvas-element CSS pixels, from the last drawn frame. */
  function hitTestStatusLabel(screenX: number, screenY: number) {
    const renderer = getRenderer()
    return renderer ? hitTestStatusLabels(renderer.statusLabels, screenX, screenY) : null
  }

  return {
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    hitTestStatusLabel
  }
}
