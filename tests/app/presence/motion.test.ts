import { describe, expect, test } from 'bun:test'

import {
  CURSOR_STREAM_GAP_MS,
  easeOutCubic,
  glideAt,
  retarget,
  type Glide
} from '@/app/presence/motion'

describe('cursor glides', () => {
  test('ease out starts fast, ends at rest, and clamps outside its range', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
  })

  test('a glide moves between its points and arrives on time', () => {
    const glide: Glide = { from: { x: 0, y: 0 }, to: { x: 100, y: 50 }, start: 1000, duration: 200 }
    expect(glideAt(glide, 1000)).toEqual({ point: { x: 0, y: 0 }, done: false })
    const half = glideAt(glide, 1100)
    expect(half.done).toBe(false)
    expect(half.point.x).toBeCloseTo(87.5)
    expect(half.point.y).toBeCloseTo(43.75)
    expect(glideAt(glide, 1200)).toEqual({ point: { x: 100, y: 50 }, done: true })
  })

  test('a new cursor appears in place, and a moved one glides on from where it is now', () => {
    const first = retarget(undefined, { x: 10, y: 10 }, 0, 200)
    expect(glideAt(first, 0)).toEqual({ point: { x: 10, y: 10 }, done: true })

    const moving = retarget(first, { x: 110, y: 10 }, 0, 200)
    const midway = glideAt(moving, 100).point
    const redirected = retarget(moving, { x: 110, y: 210 }, 100, 200)
    // It turns from where it is drawn, never jumping back to where it started.
    expect(redirected.from).toEqual(midway)
    expect(retarget(redirected, { x: 110, y: 210 }, 150, 200)).toBe(redirected)
  })

  test('a lone move eases out over the given duration', () => {
    const resting = retarget(undefined, { x: 0, y: 0 }, 0, 200)
    const moved = retarget(resting, { x: 100, y: 0 }, CURSOR_STREAM_GAP_MS + 1000, 200)
    expect(moved.steady).toBeUndefined()
    expect(moved.duration).toBe(200)
  })

  test('updates in a stream glide evenly over each gap, so the cursor never stops between them', () => {
    const start = 5000
    let glide = retarget(undefined, { x: 0, y: 0 }, 0, 200)
    glide = retarget(glide, { x: 100, y: 0 }, start, 200)
    const next = retarget(glide, { x: 200, y: 0 }, start + 150, 200)
    expect(next).toMatchObject({ steady: true, duration: 150, start: start + 150 })
    // Even pace: halfway through the gap it is halfway there.
    const from = next.from.x
    expect(glideAt(next, start + 225).point.x).toBeCloseTo(from + (200 - from) / 2)
    // Still moving until the next update is due.
    expect(glideAt(next, start + 290).done).toBe(false)
    expect(glideAt(next, start + 300)).toEqual({ point: { x: 200, y: 0 }, done: true })
  })

  test('bunched updates still take a visible step', () => {
    const glide = retarget(retarget(undefined, { x: 0, y: 0 }, 0, 200), { x: 50, y: 0 }, 1000, 200)
    const bunched = retarget(glide, { x: 60, y: 0 }, 1005, 200)
    expect(bunched.steady).toBe(true)
    expect(bunched.duration).toBeGreaterThanOrEqual(60)
  })
})
