import { useResizeObserver } from '@vueuse/core'
import { onMounted, reactive, type Ref } from 'vue'

import type { Vector } from '@pairdraw/scene-graph/primitives'

import { DRAW_FRACTION, type AgentAnchor } from './storyboard'

type Point = Vector

export interface HeroLayoutElements {
  frame: Ref<HTMLElement | null>
  headline: Ref<HTMLElement | null>
  prompt: Ref<HTMLElement | null>
  comment: Ref<HTMLElement | null>
}

/** Positions in the frame, in pixels, measured from the layers the scene points at. */
export interface HeroLayout {
  measured: boolean
  box: { width: number; height: number }
  agent: Record<AgentAnchor, Point>
  human: Point
  enter: Point
}

function ORIGIN(): Point {
  return { x: 0, y: 0 }
}

/** Where `element` sits in `root`, through the positioned boxes between them. */
function offsetIn(element: HTMLElement, root: HTMLElement): Point {
  let x = 0
  let y = 0
  let node: Element | null = element
  while (node instanceof HTMLElement && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent
  }
  return { x, y }
}

/** Room a cursor's name takes to the right of its tip. */
const CURSOR_ROOM = 130

/**
 * Measures the layers the hero scene points at, and again whenever the frame or one of them
 * changes size, as the heading does when its typeface arrives.
 */
export function useHeroLayout({
  frame,
  headline,
  prompt,
  comment
}: HeroLayoutElements): HeroLayout {
  const layout = reactive<HeroLayout>({
    measured: false,
    box: { width: 0, height: 0 },
    agent: { prompt: ORIGIN(), start: ORIGIN(), drawing: ORIGIN(), end: ORIGIN() },
    human: ORIGIN(),
    enter: ORIGIN()
  })

  function measure(): void {
    const root = frame.value
    if (!root || !headline.value || !prompt.value || !comment.value) return
    const box = offsetIn(headline.value, root)
    const { offsetWidth: width, offsetHeight: height } = headline.value
    const ask = offsetIn(prompt.value, root)
    const note = offsetIn(comment.value, root)
    // A cursor and its name stay inside the frame, which on a phone ends close to the heading.
    const inside = (x: number) => Math.min(x, root.offsetWidth - CURSOR_ROOM)
    layout.box = { width, height }
    layout.agent = {
      prompt: { x: inside(ask.x + prompt.value.offsetWidth), y: ask.y - 30 },
      start: { x: box.x + 9, y: box.y + 13 },
      drawing: { x: box.x + width * DRAW_FRACTION, y: box.y + height * DRAW_FRACTION },
      end: { x: inside(box.x + width + 4), y: box.y + height + 2 }
    }
    // Beside the comment where there is room, as in the design; above it where there is not.
    layout.human =
      note.x - 96 >= 16
        ? { x: note.x - 96, y: note.y - 50 }
        : { x: note.x + comment.value.offsetWidth * 0.55, y: note.y - 34 }
    layout.enter = { x: root.offsetWidth + 40, y: note.y + 160 }
    layout.measured = true
  }

  useResizeObserver([frame, headline, comment], measure)
  onMounted(() => {
    measure()
    void document.fonts.ready.then(measure)
  })

  return layout
}
