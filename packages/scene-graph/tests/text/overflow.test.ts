import { expect, test } from 'bun:test'

import { textLinesReach, textVerticalOffset } from '@pairdraw/scene-graph/text'

const box = { height: 12, textAlignVertical: 'BOTTOM', type: 'TEXT', derivedTextHeight: 20 }

test('lines taller than a bottom-aligned box reach above it', () => {
  // Figma saves a 20 px line in a 12 px bottom-aligned box at y -8.
  expect(textVerticalOffset(box, 20)).toBe(-8)
  expect(textLinesReach(box)).toEqual({ minY: -8, maxY: 12 })
})

test('lines taller than a centred box reach above and below it', () => {
  const centred = { ...box, textAlignVertical: 'CENTER' }
  expect(textLinesReach(centred)).toEqual({ minY: -4, maxY: 16 })
})

test('a box that grows to its lines reaches exactly its box', () => {
  const top = { ...box, textAlignVertical: 'TOP' }
  expect(textLinesReach(top)).toEqual({ minY: 0, maxY: 20 })
  expect(textLinesReach({ ...box, derivedTextHeight: null })).toEqual({ minY: 0, maxY: 12 })
  expect(textLinesReach({ ...box, type: 'FRAME' })).toEqual({ minY: 0, maxY: 12 })
})
