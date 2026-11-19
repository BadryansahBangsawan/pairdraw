import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import type { SceneNode } from '@pairdraw/scene-graph'
import { resolveNodeTextDirection } from '@pairdraw/scene-graph/text/direction'

/** A text node as a file without the field, or an older export, can hand it over. */
function nodeWithoutDirection(text: string): SceneNode {
  const graph = new SceneGraph()
  const node = graph.createNode('TEXT', graph.getPages()[0].id, { text })
  Reflect.deleteProperty(node, 'textDirection')
  return node
}

describe('a text node without a stored direction', () => {
  test('is auto-detected from its first strong character', () => {
    expect(resolveNodeTextDirection(nodeWithoutDirection('الطاولة محجوزة لك'))).toBe('RTL')
    expect(resolveNodeTextDirection(nodeWithoutDirection('Pick your table'))).toBe('LTR')
    expect(resolveNodeTextDirection(nodeWithoutDirection('123 · الطاولة'))).toBe('RTL')
  })
})
