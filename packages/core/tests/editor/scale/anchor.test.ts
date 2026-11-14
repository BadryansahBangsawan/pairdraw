import { describe, expect, test } from 'bun:test'

import {
  parseScaleFactor,
  SCALE_ANCHORS,
  scaleAnchorPoint,
  scaledBounds,
  scaleFactorForSize,
  type ScaleAnchor
} from '@pairdraw/core'

const BOUNDS = { x: 10, y: 20, width: 100, height: 40 }

describe('scale anchors', () => {
  test('name the nine points of the box, row by row from the top left', () => {
    expect(SCALE_ANCHORS.map((anchor) => scaleAnchorPoint(BOUNDS, anchor))).toEqual([
      { x: 10, y: 20 },
      { x: 60, y: 20 },
      { x: 110, y: 20 },
      { x: 10, y: 40 },
      { x: 60, y: 40 },
      { x: 110, y: 40 },
      { x: 10, y: 60 },
      { x: 60, y: 60 },
      { x: 110, y: 60 }
    ])
  })

  test.each([...SCALE_ANCHORS])(
    'a box scaled around %s keeps that point in place',
    (anchor: ScaleAnchor) => {
      const scaled = scaledBounds(BOUNDS, anchor, 2.5)
      expect([scaled.width, scaled.height]).toEqual([250, 100])
      expect(scaleAnchorPoint(scaled, anchor)).toEqual(scaleAnchorPoint(BOUNDS, anchor))
    }
  )

  test('a box scales around a canvas point too', () => {
    expect(scaledBounds(BOUNDS, { x: 0, y: 0 }, 0.5)).toEqual({
      x: 5,
      y: 10,
      width: 50,
      height: 20
    })
  })
})

describe('scale factors', () => {
  test.each([
    ['2', 2],
    ['2x', 2],
    ['0.5×', 0.5],
    ['200%', 2],
    [' 50 % ', 0.5],
    ['1,5', 1.5],
    ['.25X', 0.25]
  ])('reads %p as %p', (text, factor) => {
    expect(parseScaleFactor(text)).toBe(factor)
  })

  test.each(['', 'x', '0', '-2', 'abc', '2xx', '0%'])('rejects %p', (text) => {
    expect(parseScaleFactor(text)).toBeNull()
  })

  test('a typed width or height becomes the factor that reaches it', () => {
    expect(scaleFactorForSize(100, 250)).toBe(2.5)
    expect(scaleFactorForSize(0, 250)).toBeNull()
    expect(scaleFactorForSize(100, 0)).toBeNull()
    expect(scaleFactorForSize(100, Number.NaN)).toBeNull()
  })
})
