import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { pageId } from './helpers'

const FILL = [
  { type: 'SOLID' as const, color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
]

/** A page holding an instance with no fill, whose one layer sits away from its empty area. */
function scene() {
  const graph = new SceneGraph()
  const page = pageId(graph)
  const instance = graph.createNode('INSTANCE', page, {
    name: 'Shell',
    width: 200,
    height: 100,
    fills: []
  })
  graph.createNode('RECTANGLE', instance.id, {
    name: 'Label',
    x: 150,
    y: 60,
    width: 30,
    height: 20,
    fills: FILL
  })
  return { graph, page, instance }
}

describe('hitTestOpenContainer through an unfilled instance', () => {
  test('passes through the instance body, as a deep click does', () => {
    const { graph, page, instance } = scene()
    // A plain click still takes the instance, filled or not.
    expect(graph.hitTest(10, 10, page)?.id).toBe(instance.id)
    expect(graph.hitTestOpenContainer(10, 10, page)).toBeNull()
  })
})
