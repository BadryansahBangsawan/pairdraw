import { describe, expect, test } from 'bun:test'

import { useColorModel } from '@pairdraw/vue/controls/color-model'
import type { Color } from '@pairdraw/scene-graph/primitives'

/** sRGB red, stored in a Display P3 document: its P3 components are not its sRGB ones. */
const SRGB_RED_IN_P3 = {
  r: 0.9174875573251657,
  g: 0.20028680774084662,
  b: 0.13856059121111408,
  a: 1
}

/** A model that records the color it was last handed, as a color field's model does. */
function editing(color: Color, colorProfile?: 'srgb' | 'display-p3') {
  const updates: Color[] = []
  const model = useColorModel({
    color,
    colorProfile,
    onUpdate: (next) => updates.push(next)
  })
  return { model, updates }
}

describe('the hex readout', () => {
  test('shows the sRGB hex of the color a Display P3 document draws', () => {
    const model = useColorModel({ color: SRGB_RED_IN_P3, colorProfile: 'display-p3' })
    expect(model.hex.value).toBe('FF0000')
  })

  test('keeps an sRGB document showing the numbers it stores', () => {
    const model = useColorModel({ color: SRGB_RED_IN_P3 })
    expect(model.hex.value).toBe('EA3323')
  })

  test('keeps an sRGB document showing the same hex as before', () => {
    const model = useColorModel({ color: { r: 0.8, g: 0.4, b: 0.3, a: 1 } })
    expect(model.hex.value).toBe('CC664D')
  })
})

describe('typing a hex', () => {
  test('stores the sRGB color a Display P3 document draws, so the field reads it back', () => {
    const { model, updates } = editing(SRGB_RED_IN_P3, 'display-p3')
    model.updateHex('EA3323')
    expect(updates).toHaveLength(1)
    // Stored as Display P3 components, not as the sRGB numbers typed.
    expect(updates[0].r).not.toBeCloseTo(0.9176, 4)
    const readBack = useColorModel({ color: updates[0], colorProfile: 'display-p3' })
    expect(readBack.hex.value).toBe('EA3323')
  })

  test('keeps the sRGB document storing the numbers typed', () => {
    const { model, updates } = editing({ r: 0, g: 0, b: 0, a: 1 })
    model.updateHex('EA3323')
    expect(updates[0].r).toBeCloseTo(0.9176, 4)
    expect(updates[0].g).toBeCloseTo(0.2, 4)
    expect(updates[0].b).toBeCloseTo(0.1373, 4)
  })

  test('keeps the alpha a hex carries none of its own', () => {
    const { model, updates } = editing({ ...SRGB_RED_IN_P3, a: 0.4 }, 'display-p3')
    model.updateHex('00FF00')
    expect(updates[0].a).toBe(0.4)
  })
})
