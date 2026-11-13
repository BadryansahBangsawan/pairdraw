/**
 * Delivers the canvas pointer sequence to the plugin that holds the pointer. While a plugin waits,
 * the canvas shows a capture layer that takes the drag, so the editor's own tools never see it and
 * the plugin receives the same points the person moved through, in document coordinates.
 */
import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'

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
  function addPoint(event: PointerEvent): void {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    addPluginPointerPoint(store.screenToCanvas(event.clientX - rect.left, event.clientY - rect.top))
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId)
    addPoint(event)
  }

  // Only the button that started the sequence moves it; a hover before the press adds nothing.
  function onPointerMove(event: PointerEvent): void {
    if ((event.buttons & 1) === 0) return
    addPoint(event)
  }

  function onPointerUp(event: PointerEvent): void {
    addPoint(event)
    endPluginPointer()
  }

  function onPointerCancel(): void {
    cancelPluginPointer()
  }

  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !pluginPointerHolder.value) return
    event.preventDefault()
    cancelPluginPointer()
  })

  return { holder: pluginPointerHolder, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
