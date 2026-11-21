import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'

import { pointerPath, scrollRange, shownFrame, type PlaySession } from '@pairdraw/core/prototype'
import type { SceneGraph } from '@pairdraw/scene-graph'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'
import { WHEEL_LINE_HEIGHT } from '@/constants'

/** How far a press moves before it scrolls instead of clicking, in screen pixels. */
const DRAG_SCROLL_THRESHOLD = 4

/** What scrolling needs of play: the graph a frame shows, its offsets, and moving them. */
export interface ScrollPlay {
  graphFor: (rootId: string) => SceneGraph
  scroll: () => ReadonlyMap<string, Vector>
  scrollBy: (path: readonly string[], dx: number, dy: number) => Vector
}

/**
 * Splits a wheel over content that scrolls, in screen pixels at `zoom`: the frames along `path`
 * take what they can, and the rest pans the canvas, as the canvas pans on the wheel in play. Not
 * scrolled when no frame took any of it, so the canvas handles the wheel itself.
 */
export function splitWheel(
  scrollBy: ScrollPlay['scrollBy'],
  path: readonly string[],
  dx: number,
  dy: number,
  zoom: number
): { scrolled: boolean; pan: Vector } {
  const rest = scrollBy(path, dx / zoom, dy / zoom)
  const scrolled = rest.x !== dx / zoom || rest.y !== dy / zoom
  return {
    scrolled,
    pan: { x: rest.x === 0 ? 0 : -rest.x * zoom, y: rest.y === 0 ? 0 : -rest.y * zoom }
  }
}

/**
 * Scrolls the frames a playing prototype shows with the wheel and by dragging, innermost frame
 * first: a wheel or drag over a frame that scrolls moves its content, a wheel the frames cannot
 * take all of pans the canvas by the rest, and one no frame under the pointer can take pans the
 * canvas, as before. A drag that scrolled is no click. Pinch and Ctrl or ⌘ with the wheel still
 * zoom the canvas.
 */
export function usePlayScroll(
  store: EditorStore,
  area: Ref<HTMLCanvasElement | null>,
  session: Ref<PlaySession | null>,
  play: ScrollPlay
) {
  /** The layers under a screen point that could scroll, from the shown frame down. */
  function scrollPath(event: MouseEvent): string[] | null {
    const current = session.value
    if (!current || !(event.target instanceof HTMLCanvasElement)) return null
    const bounds = event.target.getBoundingClientRect()
    const point = store.screenToCanvas(event.clientX - bounds.left, event.clientY - bounds.top)
    const rootId = shownFrame(current)
    const graph = play.graphFor(rootId)
    // Every layer under the pointer, not only those with interactions, may hold content to scroll.
    const path = pointerPath(graph, rootId, point.x, point.y, play.scroll(), () => true)
    return path.some((id) => {
      const range = scrollRange(graph, id)
      return range.x > 0 || range.y > 0
    })
      ? path
      : null
  }

  /** Scrolls by a screen delta, and whether a frame took any of it. */
  function scrollByScreen(path: readonly string[], dx: number, dy: number): boolean {
    const { zoom } = store.state
    const rest = play.scrollBy(path, dx / zoom, dy / zoom)
    return rest.x !== dx / zoom || rest.y !== dy / zoom
  }

  useEventListener(
    area,
    'wheel',
    (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const path = scrollPath(event)
      if (!path) return
      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_HEIGHT : 1
      const dx = (event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX) * scale
      const dy = (event.shiftKey && event.deltaX === 0 ? 0 : event.deltaY) * scale
      const { scrolled, pan } = splitWheel(play.scrollBy, path, dx, dy, store.state.zoom)
      if (!scrolled) return
      // The canvas, which pans on the wheel in play, moves only by what the frames left.
      event.preventDefault()
      event.stopImmediatePropagation()
      if (pan.x !== 0 || pan.y !== 0) store.pan(pan.x, pan.y)
    },
    { capture: true, passive: false }
  )

  let drag: { path: string[]; x: number; y: number; scrolled: boolean } | null = null
  /** Whether the press that just ended scrolled, so its click runs nothing. */
  let swallowClick = false
  useEventListener(
    area,
    'mousedown',
    (event: MouseEvent) => {
      swallowClick = false
      if (event.button !== 0) return
      const path = scrollPath(event)
      if (!path) return
      drag = { path, x: event.clientX, y: event.clientY, scrolled: false }
      // Over content that scrolls, a drag scrolls it rather than panning the canvas.
      event.stopImmediatePropagation()
    },
    { capture: true }
  )
  useEventListener(
    area,
    'mousemove',
    (event: MouseEvent) => {
      if (!drag) return
      event.stopImmediatePropagation()
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      if (!drag.scrolled && Math.hypot(dx, dy) < DRAG_SCROLL_THRESHOLD) return
      drag.scrolled = true
      drag.x = event.clientX
      drag.y = event.clientY
      // Content follows the pointer, so it scrolls against the drag.
      scrollByScreen(drag.path, -dx, -dy)
    },
    { capture: true }
  )
  useEventListener(
    window,
    'mouseup',
    () => {
      swallowClick = drag?.scrolled ?? false
      drag = null
    },
    { capture: true }
  )
  useEventListener(
    area,
    'click',
    (event: MouseEvent) => {
      if (!swallowClick) return
      swallowClick = false
      event.stopImmediatePropagation()
    },
    { capture: true }
  )
}
