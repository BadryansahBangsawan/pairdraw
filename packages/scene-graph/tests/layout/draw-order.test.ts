import { describe, expect, test } from 'bun:test'

import { drawnChildIds } from '@pairdraw/scene-graph/layout'

const parent = {
  childIds: ['a', 'b', 'c'],
  layoutMode: 'HORIZONTAL' as const,
  itemReverseZIndex: false
}

describe('drawnChildIds', () => {
  test('draws children in layer order by default', () => {
    expect(drawnChildIds(parent)).toEqual(['a', 'b', 'c'])
  })

  test('draws them back to front under a reversed auto layout', () => {
    expect(drawnChildIds({ ...parent, itemReverseZIndex: true })).toEqual(['c', 'b', 'a'])
  })

  test('a frame without auto layout keeps layer order, as Figma leaves the flag unused there', () => {
    expect(drawnChildIds({ ...parent, itemReverseZIndex: true, layoutMode: 'NONE' })).toEqual([
      'a',
      'b',
      'c'
    ])
  })
})
