import { useElementSize, useEventListener } from '@vueuse/core'
import { computed, ref, watch, type Ref } from 'vue'

import { resolveEditorProfile } from '@open-pencil/core'
import { getAxisAlignedWorldBounds } from '@open-pencil/scene-graph/coordinate'

import type { EditorStore } from '@/app/editor/active-store'
import { letterboxRects, type StageRect } from '@/app/slides/letterbox'

import {
  reactionAt,
  restartSession,
  startFrame,
  startSession,
  step,
  type PlaySession
} from './session'

/**
 * Prototype play: the frame being played fitted to the canvas, everything around it blacked out,
 * and a click running the reaction under it. The session lives here, not in the document, so play
 * never changes what the design says; leaving the view drops it.
 */
export function usePrototypeStage(store: EditorStore, area: Ref<HTMLCanvasElement | null>) {
  const session = ref<PlaySession | null>(null)
  const size = useElementSize(area)

  /** How the canvas is behaving; only the play view goes live, and its revision restarts. */
  const live = computed(() => resolveEditorProfile(store.state).live)

  /** The frame's rectangle on screen, following the canvas's pan and zoom. */
  const frameRect = computed<StageRect | null>(() => {
    const shown = session.value
    const node = shown ? store.graph.getNode(shown.frameId) : undefined
    if (!node) return null
    const bounds = getAxisAlignedWorldBounds(node, store.graph)
    const { panX, panY, zoom } = store.state
    return {
      left: bounds.x * zoom + panX,
      top: bounds.y * zoom + panY,
      width: bounds.width * zoom,
      height: bounds.height * zoom
    }
  })

  const letterbox = computed(() =>
    frameRect.value
      ? letterboxRects(frameRect.value, { width: size.width.value, height: size.height.value })
      : []
  )

  /** Fits the played frame edge to edge, which is what play shows. */
  function fit() {
    const shown = session.value
    const node = shown ? store.graph.getNode(shown.frameId) : undefined
    if (!node) return
    const bounds = getAxisAlignedWorldBounds(node, store.graph)
    store.zoomToArea(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height)
  }

  watch(
    live,
    (playing) => {
      if (!playing) {
        session.value = null
        return
      }
      if (session.value) session.value = restartSession(session.value)
      else {
        const frameId = startFrame(store.graph, store.state.currentPageId, store.state.selectedIds)
        session.value = frameId ? startSession(frameId) : null
      }
      fit()
    },
    { immediate: true }
  )

  // A frame switched to, or a canvas resized, is fitted again: play always shows its whole frame.
  watch([() => session.value?.frameId, size.width, size.height], () => fit())

  // A click on the canvas runs the reaction under it, as Figma's presentation does. The listener
  // sits ahead of the canvas's own, which in play neither selects nor pans, and it leaves clicks on
  // live controls, which are elements of their own, to them.
  useEventListener(
    area,
    'click',
    (event: MouseEvent) => {
      const shown = session.value
      if (!shown || !(event.target instanceof HTMLCanvasElement)) return
      const bounds = event.target.getBoundingClientRect()
      const point = store.screenToCanvas(event.clientX - bounds.left, event.clientY - bounds.top)
      const click = reactionAt(store.graph, shown, point.x, point.y)
      if (click) session.value = step(store.graph, shown, click.action)
    },
    { capture: true }
  )

  return { session, letterbox, frameRect }
}
