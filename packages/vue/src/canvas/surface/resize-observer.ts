import { useDevicePixelRatio, useResizeObserver } from '@vueuse/core'
import type { CanvasKit } from 'canvaskit-wasm'
import { watch, type Ref } from 'vue'

type ResizeObserverOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>
  getCanvasKitValue: () => CanvasKit | null
  resizeCanvas: (canvas: HTMLCanvasElement) => void
}

/**
 * Resizes the canvas's buffer and draws it again as soon as its laid-out size changes. Resize
 * observations arrive after layout and before the frame is painted, so the frame that shows the
 * new size, such as a side panel opening, shows a drawing made for it. Waiting for the next
 * animation frame would paint the old drawing stretched to the new size first.
 */
export function useCanvasResizeObserver({
  canvasRef,
  getCanvasKitValue,
  resizeCanvas
}: ResizeObserverOptions) {
  function scheduleResize() {
    const canvas = canvasRef.value
    if (!canvas || !getCanvasKitValue()) return
    resizeCanvas(canvas)
  }

  // The canvas holds a size pinned to whole pixels, so its container tells when the page resizes.
  const { stop } = useResizeObserver(
    [canvasRef, () => canvasRef.value?.parentElement],
    scheduleResize
  )
  // A move to a screen with another pixel ratio leaves the box as it was, so no resize reports it;
  // the bitmap is sized for the new ratio here instead of being stretched.
  const { pixelRatio } = useDevicePixelRatio()
  const stopPixelRatio = watch(pixelRatio, scheduleResize)

  return {
    cancelResize: () => {
      stop()
      stopPixelRatio()
    }
  }
}
