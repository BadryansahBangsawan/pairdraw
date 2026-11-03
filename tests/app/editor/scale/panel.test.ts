import { describe, expect, test } from 'bun:test'

import { scaleFieldFactor } from '@/app/editor/scale/panel'

const BOUNDS = { x: 0, y: 0, width: 200, height: 50 }

describe('Scale panel fields', () => {
  test('a width or height scales the selection to reach it', () => {
    expect(scaleFieldFactor('width', 300, BOUNDS)).toBe(1.5)
    expect(scaleFieldFactor('height', 25, BOUNDS)).toBe(0.5)
  })

  test('a factor is taken as it is, or as a percentage', () => {
    expect(scaleFieldFactor('factor', 2, BOUNDS)).toBe(2)
    expect(scaleFieldFactor('factor', 2, BOUNDS, 'x')).toBe(2)
    expect(scaleFieldFactor('factor', 50, BOUNDS, '%')).toBe(0.5)
  })

  test('values that cannot scale give no factor', () => {
    expect(scaleFieldFactor('width', 0, BOUNDS)).toBeNull()
    expect(scaleFieldFactor('height', 10, { ...BOUNDS, height: 0 })).toBeNull()
    expect(scaleFieldFactor('factor', -1, BOUNDS)).toBeNull()
  })
})
