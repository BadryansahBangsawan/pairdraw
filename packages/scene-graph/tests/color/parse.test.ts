import { describe, expect, test } from 'bun:test'

import { tryParseColor } from '@pairdraw/scene-graph/color'

describe('tryParseColor', () => {
  test('reads a `none` channel as zero', () => {
    expect(tryParseColor('rgb(none 255 0)')).toEqual({ r: 0, g: 1, b: 0, a: 1 })
  })

  test('sRGB syntaxes keep their numbers in either profile', () => {
    expect(tryParseColor('#ff0000', 'display-p3')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(tryParseColor('rgb(51 128 204)', 'display-p3')?.r).toBeCloseTo(0.2, 5)
  })

  test('a color that names its space converts into the profile, inside its gamut', () => {
    const p3 = tryParseColor('color(display-p3 1 0 0)', 'display-p3')
    expect(p3?.r).toBeCloseTo(1, 9)
    expect(p3?.g).toBeCloseTo(0, 9)
    const srgb = tryParseColor('color(display-p3 1 0 0)')
    for (const channel of [srgb?.r, srgb?.g, srgb?.b]) {
      expect(channel).toBeGreaterThanOrEqual(0)
      expect(channel).toBeLessThanOrEqual(1)
    }
    expect(tryParseColor('oklch(0.6 0.1 250)', 'display-p3')?.b).toBeGreaterThan(0.5)
  })

  test('a component past the float range is no color', () => {
    for (const input of ['oklch(0.5 1e999 0)', 'color(display-p3 1e999 0 0)', 'rgb(1e999 0 0)']) {
      expect(tryParseColor(input, 'display-p3')).toBeNull()
    }
  })
})
