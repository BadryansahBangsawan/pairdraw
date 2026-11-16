import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { pageId, rect } from './helpers'

describe('hitTest with a mask', () => {
  function masked() {
    const graph = new SceneGraph()
    const below = rect(graph, 'Below', 150, 150, 100, 100)
    const mask = graph.createNode('RECTANGLE', pageId(graph), {
      name: 'Mask',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      isMask: true
    })
    const content = rect(graph, 'Content', 0, 0, 200, 200)
    return { graph, below, mask, content }
  }

  test('hits a masked layer inside the mask', () => {
    const { graph, content } = masked()
    expect(graph.hitTest(25, 25, pageId(graph))?.id).toBe(content)
  })

  test('misses a masked layer where the mask cuts it away', () => {
    const { graph } = masked()
    expect(graph.hitTest(100, 100, pageId(graph))).toBeNull()
  })

  test('still hits a layer below the mask', () => {
    const { graph, below } = masked()
    expect(graph.hitTest(175, 175, pageId(graph))?.id).toBe(below)
  })

  test('a hidden mask clips nothing', () => {
    const { graph, mask, content } = masked()
    graph.updateNode(mask.id, { visible: false })
    expect(graph.hitTest(100, 100, pageId(graph))?.id).toBe(content)
  })
})

describe('hitTest of a zero-size layer', () => {
  test('hits a zero-width layer next to its line', () => {
    const graph = new SceneGraph()
    const id = rect(graph, 'Vertical', 10, 10, 0, 50)
    expect(graph.hitTest(12, 30, pageId(graph))?.id).toBe(id)
    expect(graph.hitTest(30, 30, pageId(graph))).toBeNull()
  })

  test('hits a zero-height layer next to its line', () => {
    const graph = new SceneGraph()
    const id = rect(graph, 'Horizontal', 10, 10, 50, 0)
    expect(graph.hitTest(30, 8, pageId(graph))?.id).toBe(id)
  })
})
