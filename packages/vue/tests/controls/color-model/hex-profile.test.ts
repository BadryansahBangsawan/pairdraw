import { describe, expect, test } from 'bun:test'

import { useColorModel } from '@pairdraw/vue/controls/color-model'

/** sRGB red, stored in a Display P3 document: its P3 components are not its sRGB ones. */
const SRGB_RED_IN_P3 = {
  r: 0.9174875573251657,
  g: 0.20028680774084662,
  b: 0.13856059121111408,
  a: 1
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
