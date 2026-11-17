import type { CanvasKit } from 'canvaskit-wasm'
import { onScopeDispose, watch } from 'vue'
import type { Ref } from 'vue'

import { getCanvasKit } from '@pairdraw/core/canvaskit'

type CanvasKitLoaderOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>
  lifecycle: { destroyed: boolean }
  setCanvasKit: (ck: CanvasKit | null) => void
  /** Whether a surface the canvas can draw on was made. */
  createSurface: (canvas: HTMLCanvasElement) => boolean
  loadFonts: () => Promise<unknown> | undefined
  renderNow: () => void
  onReady?: () => void
  onFailed?: (error: unknown) => void
  /**
   * Loads CanvasKit. Tests pass a stand-in; the canvas uses the shared loader.
   * A default keeps the unit test from downloading the WASM module.
   */
  loadCanvasKit?: () => Promise<CanvasKit>
}

export function useCanvasKitLoader({
  canvasRef,
  lifecycle,
  setCanvasKit,
  createSurface,
  loadFonts,
  renderNow,
  onReady,
  onFailed,
  loadCanvasKit = getCanvasKit
}: CanvasKitLoaderOptions) {
  const isDestroyed = () => lifecycle.destroyed
  // Bumped when a new element arrives, so a start still in flight cannot make a surface
  // on a canvas that has already been replaced.
  let generation = 0

  async function init(canvas: HTMLCanvasElement, generationAtStart: number) {
    const stillCurrent = () =>
      !isDestroyed() && canvasRef.value === canvas && generation === generationAtStart

    if (!stillCurrent()) return

    setCanvasKit(await loadCanvasKit())
    if (!stillCurrent()) return

    await new Promise((resolve) => {
      requestAnimationFrame(resolve)
    })
    if (!stillCurrent()) return
    if (!createSurface(canvas)) throw new Error('WebGL is unavailable, so the canvas cannot draw')
    await loadFonts()
    if (!stillCurrent()) return
    renderNow()
    onReady?.()
  }

  function start(canvas: HTMLCanvasElement) {
    const generationAtStart = ++generation
    void init(canvas, generationAtStart).catch((error: unknown) => {
      if (!onFailed) throw error
      if (!isDestroyed() && generation === generationAtStart) onFailed(error)
    })
  }

  // A CanvasSurface child hands its element over after the root has mounted, so waiting for
  // mount alone would find none. The app replaces the element when the browser keeps a context
  // lost, and that new element has to start too: watching once would leave it blank. The same
  // element does not start again.
  watch(
    canvasRef,
    (canvas, previous) => {
      if (!canvas || canvas === previous) return
      start(canvas)
    },
    { flush: 'post', immediate: true }
  )

  onScopeDispose(() => {
    lifecycle.destroyed = true
    generation += 1
  })
}
