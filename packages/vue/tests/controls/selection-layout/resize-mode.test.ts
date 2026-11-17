import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { textResizeMode } from '#vue/controls/selection-layout/use'

function text(fields: { textAutoResize: 'NONE' | 'TRUNCATE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' }) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  return graph.createNode('TEXT', page.id, { text: 'Card', ...fields })
}

describe('the layout panel resize mode of a text layer', () => {
  test('a box that ends its lines is fixed, not auto height', () => {
    expect(textResizeMode(text({ textAutoResize: 'TRUNCATE' }))).toBe('FIXED')
    expect(textResizeMode(text({ textAutoResize: 'NONE' }))).toBe('FIXED')
  })

  test('a height that follows the text is auto height, and a free text is auto width', () => {
    expect(textResizeMode(text({ textAutoResize: 'HEIGHT' }))).toBe('AUTO_HEIGHT')
    expect(textResizeMode(text({ textAutoResize: 'WIDTH_AND_HEIGHT' }))).toBe('AUTO_WIDTH')
  })
})
