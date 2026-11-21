import { describe, expect, test } from 'bun:test'

import { splitWheel } from '@/app/editor/prototype/scroll'

/** Frames that can take at most `room` document units of a vertical scroll. */
function framesWithRoom(room: number) {
  return (_path: readonly string[], dx: number, dy: number) => {
    const taken = Math.max(-room, Math.min(room, dy))
    return { x: dx, y: dy - taken }
  }
}

describe('a wheel over content that scrolls', () => {
  test('scrolls the frames and leaves the canvas alone while they take all of it', () => {
    expect(splitWheel(framesWithRoom(100), ['list'], 0, 40, 2)).toEqual({
      scrolled: true,
      pan: { x: 0, y: 0 }
    })
  })

  test('pans the canvas by what is left at a scroll edge, as the canvas pans on the wheel', () => {
    // 40 screen px at zoom 2 is 20 units; the frames take 5, so 15 units pan, 30 screen px.
    expect(splitWheel(framesWithRoom(5), ['list'], 0, 40, 2)).toEqual({
      scrolled: true,
      pan: { x: 0, y: -30 }
    })
  })

  test('is no scroll when no frame takes any of it', () => {
    expect(splitWheel(framesWithRoom(0), ['list'], 0, 40, 2).scrolled).toBe(false)
  })
})
