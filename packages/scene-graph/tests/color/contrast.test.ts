import { describe, expect, test } from 'bun:test'

import {
  compositeOver,
  contrastRatio,
  darkenForContrast,
  readableForeground
} from '@pairdraw/scene-graph/color'
import type { Color } from '@pairdraw/scene-graph/primitives'

const BLACK: Color = { r: 0, g: 0, b: 0, a: 1 }
const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 }
const GRAY_94: Color = { r: 0x94 / 255, g: 0x94 / 255, b: 0x94 / 255, a: 1 }

describe('contrastRatio', () => {
  test('matches the WCAG 2 extremes and is symmetric', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 6)
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 6)
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 6)
  })

  test('measures a mid gray on white', () => {
    expect(contrastRatio(GRAY_94, WHITE)).toBeCloseTo(3.03, 2)
  })
})

describe('compositeOver', () => {
  test('uses the foreground alpha by default and returns an opaque color', () => {
    expect(compositeOver({ ...BLACK, a: 0.5 }, WHITE)).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 1 })
  })

  test('takes an explicit alpha for fill or node opacity', () => {
    const blended = compositeOver(BLACK, WHITE, 0.4)
    expect(blended.r).toBeCloseTo(0.6, 10)
    expect(contrastRatio(blended, WHITE)).toBeCloseTo(2.849, 3)
    expect(compositeOver(BLACK, WHITE, 0)).toEqual(WHITE)
  })
})

describe('readableForeground', () => {
  test('picks whichever of black and white contrasts more', () => {
    expect(readableForeground({ r: 0xeb / 255, g: 0x57 / 255, b: 0x4a / 255 })).toEqual(BLACK)
    expect(readableForeground({ r: 0x25 / 255, g: 0x63 / 255, b: 0xeb / 255 })).toEqual(WHITE)
    expect(readableForeground(GRAY_94)).toEqual(BLACK)
  })
})

describe('darkenForContrast', () => {
  const amber: Color = { r: 1, g: 0.76, b: 0.03, a: 1 }

  test('darkens just enough for white text to reach 4.5:1, keeping the hue', () => {
    const darkened = darkenForContrast(amber)
    expect(contrastRatio(darkened, WHITE)).toBeGreaterThanOrEqual(4.5)
    // Rounding the channels to 8 bits, as browsers do, may overshoot a little.
    expect(contrastRatio(darkened, WHITE)).toBeLessThan(4.55)
    // Every channel is scaled by one factor and then rounded to 8 bits, so the hue holds
    // within that rounding.
    expect(darkened.g / darkened.r).toBeCloseTo(amber.g / amber.r, 2)
    expect(darkened.b / darkened.r).toBeCloseTo(amber.b / amber.r, 2)
    expect(darkened.a).toBe(1)
  })

  test('leaves a color that already reaches the ratio as it is', () => {
    const deep: Color = { r: 0.2, g: 0.1, b: 0.5, a: 1 }
    expect(darkenForContrast(deep)).toBe(deep)
  })

  test('takes another text color and ratio', () => {
    const darkened = darkenForContrast(amber, GRAY_94, 3)
    expect(contrastRatio(darkened, GRAY_94)).toBeGreaterThanOrEqual(3)
  })

  test('still reaches the ratio after the browser rounds the channels to 8 bits', () => {
    // White on this purple is 4.35:1 raw and lands on 4.50:1 unrounded; rounding to
    // rgb(122, 90, 250) drops to 4.496:1, which is the bug this guard pins.
    const purple = { r: 0x7c / 255, g: 0x5c / 255, b: 0xff / 255, a: 1 }
    const darkened = darkenForContrast(purple)
    const eightBit = {
      ...darkened,
      r: Math.round(darkened.r * 255) / 255,
      g: Math.round(darkened.g * 255) / 255,
      b: Math.round(darkened.b * 255) / 255
    }
    expect(contrastRatio(eightBit, WHITE)).toBeGreaterThanOrEqual(4.5)
  })
})
