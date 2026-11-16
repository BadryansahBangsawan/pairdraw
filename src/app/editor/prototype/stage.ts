import { useElementSize, useEventListener } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

import { resolveEditorProfile } from '@pairdraw/core'
import { renderNodesToImage } from '@pairdraw/core/io/formats/raster'
import type { PrototypeAction } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'

import type { EditorStore } from '@/app/editor/active-store'
import { letterboxRects, nodeStageRect, type StageRect } from '@/app/slides/letterbox'

import {
  reactionAt,
  restartSession,
  shownFrame,
  startFrame,
  startSession,
  step,
  timeoutReactions,
  type PlaySession
} from './session'

/** How long a dissolve takes, matching the transition's own duration in seconds. */
const DISSOLVE_MS = 300

/**
 * Prototype play: the frame being played fitted to the canvas, everything around it blacked out,
 * and a click running the reaction under it. The session lives here, not in the document, so play
 * never changes what the design says; leaving the view drops it.
 */
export function usePrototypeStage(store: EditorStore, area: Ref<HTMLCanvasElement | null>) {
  const session = ref<PlaySession | null>(null)
  const size = useElementSize(area)
  /** The frame before a dissolve started, as the PNG the crossfade fades out over the canvas. */
  const dissolvingFrom = ref<{ src: string; rect: StageRect } | null>(null)

  /**
   * How the canvas is behaving while a prototype plays. A slide presentation is live too, and it
   * keeps its own zoom and scroll, so only the play view starts a session and fits its frame.
   */
  const live = computed(() =>
    store.getPresentation() ? null : resolveEditorProfile(store.state).live
  )

  /** The frame the canvas fits and shows, which is the top overlay when one is open. */
  const shownRect = computed<StageRect | null>(() => {
    const shown = session.value
    return shown ? nodeStageRect(store.graph, shownFrame(shown), store.state) : null
  })

  const letterbox = computed(() =>
    shownRect.value
      ? letterboxRects(shownRect.value, { width: size.width.value, height: size.height.value })
      : []
  )

  /** Fits the shown frame edge to edge, which is what play shows. */
  function fit() {
    const rect = shownRect.value
    if (!rect) return
    const { panX, panY, zoom } = store.state
    store.zoomToArea(
      (rect.left - panX) / zoom,
      (rect.top - panY) / zoom,
      (rect.left - panX + rect.width) / zoom,
      (rect.top - panY + rect.height) / zoom
    )
  }

  /** Whether an overlay is open, which dims everything but the overlay frame. */
  const scrim = computed(() => (session.value?.overlays.length ?? 0) > 0)

  /**
   * The previous frame drawn to a PNG the canvas crossfades from during a dissolve. A frame that
   * cannot be drawn leaves none, so the transition falls back to a cut instead of wrong pixels.
   */
  function snapshotBefore(): StageRect | null {
    const shown = session.value
    if (!shown) return null
    const node = store.graph.getNode(shownFrame(shown))
    if (!node || !store.renderer) return null
    const bounds = getAxisAlignedWorldBounds(node, store.graph)
    const scale = Math.min(1, 640 / Math.max(bounds.width, bounds.height, 1))
    const bytes = renderNodesToImage(
      store.renderer.ck,
      store.renderer,
      store.graph,
      store.state.currentPageId,
      [node.id],
      { scale, format: 'PNG' }
    )
    if (!bytes) return null
    const blob = new Blob([bytes], { type: 'image/png' })
    const { panX, panY, zoom } = store.state
    const rect: StageRect = {
      left: bounds.x * zoom + panX,
      top: bounds.y * zoom + panY,
      width: bounds.width * zoom,
      height: bounds.height * zoom
    }
    dissolvingFrom.value = { src: URL.createObjectURL(blob), rect }
    window.setTimeout(() => {
      if (dissolvingFrom.value) URL.revokeObjectURL(dissolvingFrom.value.src)
      dissolvingFrom.value = null
    }, DISSOLVE_MS + 100)
    return rect
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

  // The shown frame's AFTER_TIMEOUT reactions run once their delay passes. Restart and a new
  // document drop timers even when the frame id stays, and leaving play or unmounting drops them
  // too. A callback that still runs after that does not step.
  const timers = new Set<number>()
  let timerGeneration = 0
  function clearTimers() {
    timerGeneration += 1
    for (const timer of timers) window.clearTimeout(timer)
    timers.clear()
  }
  function armTimers() {
    clearTimers()
    const shown = session.value
    const generation = timerGeneration
    if (!shown) return
    const frameId = shownFrame(shown)
    const schedule = (action: PrototypeAction, delayMs: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        if (generation !== timerGeneration) return
        const current = session.value
        if (!current || shownFrame(current) !== frameId) return
        session.value = step(store.graph, current, action)
      }, delayMs)
      timers.add(timer)
    }
    for (const { action, delayMs } of timeoutReactions(store.graph, shown)) {
      schedule(action, delayMs)
    }
  }
  watch(
    () => {
      const shown = session.value
      if (!shown || !live.value) return null
      return `${live.value.revision}:${shownFrame(shown)}`
    },
    armTimers,
    { immediate: true }
  )
  onScopeDispose(clearTimers)

  // A frame switched to, or a canvas resized, is fitted again: play always shows its whole frame.
  watch([() => (session.value ? shownFrame(session.value) : null), size.width, size.height], () =>
    fit()
  )

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
      if (click) {
        if (click.transition?.type === 'DISSOLVE') snapshotBefore()
        session.value = step(store.graph, shown, click.action)
      }
    },
    { capture: true }
  )

  return { session, letterbox, frameRect: shownRect, scrim, dissolvingFrom }
}
