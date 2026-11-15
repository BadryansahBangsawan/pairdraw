import { useResizeObserver } from '@vueuse/core'
import type { CanvasKit } from 'canvaskit-wasm'
import type { Ref } from 'vue'

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
  const { stop } = useResizeObserver(canvasRef, () => {
    const canvas = canvasRef.value
    if (!canvas || !getCanvasKitValue()) return
    resizeCanvas(canvas)
  })

  return { cancelResize: stop }
}
