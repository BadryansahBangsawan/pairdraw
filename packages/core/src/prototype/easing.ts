import type { PrototypeEasingType } from '@pairdraw/scene-graph'
import { DEFAULT_PROTOTYPE_EASING, PROTOTYPE_EASING_CURVES } from '@pairdraw/scene-graph/constants'

/** Bisection steps that solve a curve's x for its t; 32 halvings are far below a pixel. */
const BISECTION_STEPS = 32

function bezier(t: number, p1: number, p2: number): number {
  return 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t
}

/**
 * How far along a transition eased by `easing` is at `progress` of its time, from 0 to 1; no
 * easing eases as Figma's default does. The player and a recording both read it, so they move
 * alike.
 */
export function easingAt(easing: PrototypeEasingType | undefined, progress: number): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  const [x1, y1, x2, y2] = PROTOTYPE_EASING_CURVES[easing ?? DEFAULT_PROTOTYPE_EASING]
  if (x1 === y1 && x2 === y2) return progress
  // x(t) rises monotonically, so bisection finds the t whose x is `progress`.
  let low = 0
  let high = 1
  for (let index = 0; index < BISECTION_STEPS; index++) {
    const middle = (low + high) / 2
    if (bezier(middle, x1, x2) < progress) low = middle
    else high = middle
  }
  return bezier((low + high) / 2, y1, y2)
}

/** `easing` as a CSS timing function, for a transition the browser animates. */
export function easingCSS(easing: PrototypeEasingType | undefined): string {
  const [x1, y1, x2, y2] = PROTOTYPE_EASING_CURVES[easing ?? DEFAULT_PROTOTYPE_EASING]
  if (x1 === y1 && x2 === y2) return 'linear'
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
}
