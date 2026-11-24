import { describe, expect, test } from 'bun:test'

import { colorToProfileCSS, convertColor, toExtendedSRGB } from '@pairdraw/scene-graph/color'

const P3_RED = { r: 1, g: 0, b: 0, a: 1 }

describe('convertColor', () => {
  test('reads a Display P3 red as an sRGB color outside its gamut', () => {
    const srgb = convertColor(P3_RED, 'display-p3', 'srgb')
    expect(srgb.r).toBeCloseTo(1.0930, 3)
    expect(srgb.g).toBeCloseTo(-0.2267, 3)
    expect(srgb.b).toBeCloseTo(-0.1501, 3)
    expect(srgb.a).toBe(1)
  })

  test('round-trips a wide-gamut color', () => {
    const back = convertColor(convertColor(P3_RED, 'display-p3', 'srgb'), 'srgb', 'display-p3')
    expect(back.r).toBeCloseTo(1, 6)
    expect(back.g).toBeCloseTo(0, 6)
    expect(back.b).toBeCloseTo(0, 6)
  })

  test('maps an out-of-gamut color into sRGB when asked', () => {
    const mapped = convertColor(P3_RED, 'display-p3', 'srgb', 'map')
    for (const channel of [mapped.r, mapped.g, mapped.b]) {
      expect(channel).toBeGreaterThanOrEqual(0)
      expect(channel).toBeLessThanOrEqual(1)
    }
  })

  test('returns the color as it is within one profile', () => {
    expect(convertColor(P3_RED, 'display-p3', 'display-p3')).toBe(P3_RED)
  })
})

describe('toExtendedSRGB', () => {
  test('leaves an sRGB color as it is', () => {
    const color = { r: 0.2, g: 0.4, b: 0.6, a: 0.5 }
    expect(toExtendedSRGB(color, 'srgb')).toBe(color)
  })

  test('gives a Display P3 color the same components as convertColor', () => {
    const extended = toExtendedSRGB(P3_RED, 'display-p3')
    const converted = convertColor(P3_RED, 'display-p3', 'srgb')
    expect(extended.r).toBeCloseTo(converted.r, 9)
    expect(extended.g).toBeCloseTo(converted.g, 9)
    expect(extended.b).toBeCloseTo(converted.b, 9)
    expect(extended.a).toBe(1)
  })
})

describe('colorToProfileCSS', () => {
  test('shows a P3 document color as CSS in the profile it is drawn in', () => {
    expect(colorToProfileCSS(P3_RED, 'display-p3', 'display-p3')).toStartWith('color(display-p3')
  })

  test('clips a P3 document color shown in sRGB', () => {
    expect(colorToProfileCSS(P3_RED, 'display-p3', 'srgb')).toStartWith('rgb(255, 0, 0')
  })
})
