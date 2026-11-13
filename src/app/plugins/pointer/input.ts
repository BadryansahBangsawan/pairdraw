/**
 * Delivers the canvas pointer sequence to the plugin that holds the pointer. While a plugin waits,
 * the canvas shows a capture layer that takes the drag, so the editor's own tools never see it and
 * the plugin receives the same points the person moved through, in document coordinates.
 */
import { useEventListener } from '@vueuse/core'
import { watch, type Ref } from 'vue'

import type { EditorStore } from '@/app/editor/session/create'

import {
  addPluginPointerPoint,
  cancelPluginPointer,
  endPluginPointer,
  pluginPointerHolder
} from './index'

export function usePluginPointerInput(
  canvasRef: Ref<HTMLCanvasElement | null>,
  store: EditorStore
) {
  // Only a press this layer took starts a sequence; a release from elsewhere is not its end.
  let started = false

  function addPoint(event: PointerEvent): void {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    addPluginPointerPoint(store.screenToCanvas(event.clientX - rect.left, event.clientY - rect.top))
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return
    started = true
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId)
    addPoint(event)
  }

  // Only the pressed primary button moves the sequence; a hover before the press adds nothing.
  function onPointerMove(event: PointerEvent): void {
    if (!started || (event.buttons & 1) === 0) return
    addPoint(event)
  }

  function onPointerUp(event: PointerEvent): void {
    if (!started || event.button !== 0) return
    started = false
    addPoint(event)
    endPluginPointer()
  }

  function onPointerCancel(): void {
    started = false
    cancelPluginPointer()
  }

  // A sequence that ends another way, such as Escape, must not leave a press half-started.
  watch(pluginPointerHolder, (holder) => {
    if (!holder) started = false
  })

  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !pluginPointerHolder.value) return
    event.preventDefault()
    cancelPluginPointer()
  })

  return { holder: pluginPointerHolder, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
