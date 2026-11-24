import { describe, expect, test } from 'bun:test'

import { parseCSSColor, parseCSSNumber } from '@pairdraw/scene-graph/css'

describe('parseCSSNumber', () => {
  test.each([
    ['12', 12],
    ['12px', 12],
    [' -4.5PX ', -4.5],
    ['0.75rem', 12],
    ['.5', 0.5]
  ])('reads %p as %p pixels', (value, pixels) => {
    expect(parseCSSNumber(value)).toBe(pixels)
  })

  test.each([undefined, '', 'auto', '50%', '1.5em', '10vh', 'calc(1px + 2px)', 'abc'])(
    'reads no pixels from %p',
    (value) => {
      expect(parseCSSNumber(value)).toBeNull()
    }
  )
})

describe('parseCSSColor', () => {
  test('reads a color that names its space into the given profile', () => {
    expect(parseCSSColor('color(display-p3 1 0 0)', 'display-p3')).toEqual({
      r: 1,
      g: 0,
      b: 0,
      a: 1
    })
    const srgb = parseCSSColor('color(display-p3 1 0 0)')
    expect(srgb?.r).toBeLessThan(1)
  })

  test('maps a wide-gamut color into sRGB', () => {
    for (const value of ['oklch(0.5 0.1 200)', 'color(display-p3 0 1 0)']) {
      const color = parseCSSColor(value)
      if (!color) throw new Error(`${value} did not parse`)
      for (const channel of [color.r, color.g, color.b]) {
        expect(channel).toBeGreaterThanOrEqual(0)
        expect(channel).toBeLessThanOrEqual(1)
      }
    }
    // An sRGB syntax keeps its numbers, as Figma takes typed colors in either document profile.
    expect(parseCSSColor('rgb(300 0 0)')).toEqual({ r: 300 / 255, g: 0, b: 0, a: 1 })
  })

  test('reads a color', () => {
    expect(parseCSSColor(' #ff0000 ')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  test.each([undefined, '', 'nope', 'transparent', 'rgba(0, 0, 0, 0)', 'rgb(0 0 0 / 0)', '#0000'])(
    'reads no color from %p, which paints nothing',
    (value) => {
      expect(parseCSSColor(value)).toBeNull()
    }
  )
})
