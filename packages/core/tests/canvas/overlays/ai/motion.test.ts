import { describe, expect, test } from 'bun:test'

import { entranceDelays, entranceFrame, shimmerPosition } from '#core/canvas/overlays/ai/motion'
import {
  AI_ENTER_MAX_DELAY_MS,
  AI_ENTER_STAGGER_MS,
  AI_SHIMMER_BAND,
  AI_SHIMMER_PERIOD_MS
} from '#core/constants'

describe('entrance delays of the layers an agent adds', () => {
  test('start a few layers one stagger apart, in the order given', () => {
    expect(entranceDelays(0)).toEqual([])
    expect(entranceDelays(1)).toEqual([0])
    expect(entranceDelays(3)).toEqual([0, AI_ENTER_STAGGER_MS, AI_ENTER_STAGGER_MS * 2])
  })

  test('squeeze many layers so the last starts at the cap', () => {
    const delays = entranceDelays(201)
    expect(delays[0]).toBe(0)
    expect(delays.at(-1)).toBeCloseTo(AI_ENTER_MAX_DELAY_MS)
    for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeGreaterThan(delays[i - 1] ?? 0)
  })
})

describe('entrance frame', () => {
  test('traces the outline before the layer settles, then fades it and the wash out', () => {
    const start = entranceFrame(0)
    expect(start.trace).toBe(0)
    expect(start.wash).toBeCloseTo(0.2)
    expect(entranceFrame(0.6).trace).toBeCloseTo(1)
    expect(entranceFrame(0.6).outline).toBeCloseTo(0.9)
    const end = entranceFrame(1)
    expect(end.outline).toBeCloseTo(0)
    expect(end.wash).toBeCloseTo(0)
  })

  test('holds its ends outside the entrance', () => {
    expect(entranceFrame(-1)).toEqual(entranceFrame(0))
    expect(entranceFrame(2)).toEqual(entranceFrame(1))
  })
})

describe('shimmer position', () => {
  test('sweeps from before the area to past it once a period', () => {
    expect(shimmerPosition(0, 400)).toBe(-AI_SHIMMER_BAND)
    expect(shimmerPosition(AI_SHIMMER_PERIOD_MS / 2, 400)).toBeCloseTo(200)
    expect(shimmerPosition(AI_SHIMMER_PERIOD_MS * 3, 400)).toBe(-AI_SHIMMER_BAND)
  })
})
