/** How far the wheel turns, in pixels, before a fitted slide or a scrolled-out one steps. */
export const WHEEL_STEP_DISTANCE = 120
/** A pause this long, in milliseconds, ends one wheel turn; a trackpad's glide has no gaps. */
export const WHEEL_TURN_GAP_MS = 250

/** One wheel event a presentation could not scroll with: how far it turned, and when. */
interface WheelTurn {
  deltaX: number
  deltaY: number
  /** The event's `timeStamp`, in milliseconds. */
  time: number
}

/**
 * Turns the wheel into slide steps once the slide cannot scroll any further: a turn past
 * `WHEEL_STEP_DISTANCE` steps one slide forward or back, and the rest of that turn, a trackpad's
 * glide included, steps no further until the wheel rests for `WHEEL_TURN_GAP_MS`.
 */
export function createWheelStepper() {
  let travelled = 0
  let lastTime = Number.NEGATIVE_INFINITY
  let stepped = false

  return {
    /** The step this turn makes, if it makes one. */
    turn({ deltaX, deltaY, time }: WheelTurn): 'next' | 'previous' | null {
      if (time - lastTime > WHEEL_TURN_GAP_MS) {
        travelled = 0
        stepped = false
      }
      lastTime = time
      if (stepped) return null
      travelled += Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
      if (Math.abs(travelled) < WHEEL_STEP_DISTANCE) return null
      stepped = true
      const step = travelled > 0 ? 'next' : 'previous'
      travelled = 0
      return step
    },
    /** The slide scrolled, so the wheel starts its count again. */
    reset() {
      travelled = 0
    }
  }
}
