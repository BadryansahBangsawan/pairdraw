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
