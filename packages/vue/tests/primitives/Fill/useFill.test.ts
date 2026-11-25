import { describe, expect, test } from 'bun:test'

import { ref } from 'vue'

import type { Fill } from '@pairdraw/scene-graph'
import { fillIsTransparent, fillSwatchBackground, useFill } from '@pairdraw/vue/primitives/Fill'

/** An image fill as a document stores it: no `color`, since the bytes are the paint. */
function imageFill(): Fill {
  return {
    type: 'IMAGE',
    imageHash: 'abc',
    visible: true,
    opacity: 1,
    blendMode: 'NORMAL'
  } as Fill
}

/** sRGB red, stored in a Display P3 document: its P3 components are not its sRGB ones. */
const SRGB_RED_IN_P3 = {
  r: 0.9174875573251657,
  g: 0.20028680774084662,
  b: 0.13856059121111408,
  a: 1
}

function solid(color: Fill['color']): Fill {
  return { type: 'SOLID', color, opacity: 1, visible: true }
}

describe('a swatch in the document profile', () => {
  test('a Display P3 document draws its stored components in that profile', () => {
    expect(fillSwatchBackground(solid(SRGB_RED_IN_P3), 'display-p3')).toBe(
      'color(display-p3 0.9174875573251657 0.20028680774084662 0.13856059121111408)'
    )
  })

  test('an sRGB document draws the same color as its sRGB hex', () => {
    expect(fillSwatchBackground(solid(SRGB_RED_IN_P3), 'srgb')).toBe('#EA3323')
  })

  test('gradient stops convert too, keeping their alpha', () => {
    const gradient: Fill = {
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      visible: true,
      gradientStops: [
        { color: SRGB_RED_IN_P3, position: 0 },
        { color: { ...SRGB_RED_IN_P3, a: 0.5 }, position: 1 }
      ]
    } as Fill
    expect(fillSwatchBackground(gradient, 'display-p3')).toBe(
      'linear-gradient(to right, color(display-p3 0.9174875573251657 0.20028680774084662 0.13856059121111408) 0%, color(display-p3 0.9174875573251657 0.20028680774084662 0.13856059121111408 / 0.5) 100%)'
    )
  })
})

describe('image fills without a color', () => {
  test('swatch background and transparency do not read a missing color', () => {
    expect(() => fillSwatchBackground(imageFill())).not.toThrow()
    expect(fillIsTransparent(imageFill())).toBe(true)
  })

  test('converting to solid, gradient and mesh fills starts from a color', () => {
    const convert = (action: 'toSolid' | 'toGradient' | 'toMesh') => {
      const fill = ref(imageFill())
      const updates: Fill[] = []
      useFill(fill, (next) => updates.push(next)).actions[action]()
      return updates[0]
    }

    expect(convert('toSolid')?.color?.a).toBeDefined()
    expect(convert('toGradient')?.gradientStops?.[0]?.color.a).toBeDefined()
    expect(convert('toMesh')?.meshPoints?.[0]?.color.a).toBeDefined()
  })
})
