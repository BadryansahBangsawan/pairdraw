import { afterEach, describe, expect, test } from 'bun:test'

import { computeAllLayouts, setTextMeasurer } from '@pairdraw/core/layout'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

function scene() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  return { graph, page }
}

function truncatingText(graph: SceneGraph, parentId: string, width: number, height: number) {
  return graph.createNode('TEXT', parentId, {
    text: 'a long line that truncates',
    fontSize: 12,
    textAutoResize: 'TRUNCATE',
    maxLines: 2,
    width,
    height
  })
}

afterEach(() => setTextMeasurer(null))

// A truncating text clips to the box it has, so auto layout keeps that box, as Figma does.
describe('a truncating text inside auto layout', () => {
  test('keeps its box in a fixed row, measured', () => {
    setTextMeasurer(() => ({ width: 500, height: 80 }))
    const { graph, page } = scene()
    const row = graph.createNode('FRAME', page, {
      layoutMode: 'HORIZONTAL',
      width: 300,
      height: 100,
      primaryAxisSizing: 'FIXED'
    })
    const text = truncatingText(graph, row.id, 50, 10)
    const sibling = graph.createNode('RECTANGLE', row.id, { width: 20, height: 20 })
    computeAllLayouts(graph)
    expect([text.width, text.height]).toEqual([50, 10])
    expect(sibling.x).toBe(50)
  })

  test('keeps its box without a measurer', () => {
    const { graph, page } = scene()
    const row = graph.createNode('FRAME', page, {
      layoutMode: 'HORIZONTAL',
      width: 300,
      height: 100,
      primaryAxisSizing: 'FIXED'
    })
    const text = truncatingText(graph, row.id, 50, 10)
    computeAllLayouts(graph)
    expect([text.width, text.height]).toEqual([50, 10])
  })

  test('sizes a hugging row to that box', () => {
    setTextMeasurer(() => ({ width: 500, height: 80 }))
    const { graph, page } = scene()
    const row = graph.createNode('FRAME', page, {
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      itemSpacing: 8
    })
    truncatingText(graph, row.id, 50, 10)
    graph.createNode('RECTANGLE', row.id, { width: 20, height: 30 })
    computeAllLayouts(graph)
    expect([row.width, row.height]).toEqual([78, 30])
  })

  test('is not zeroed when appended or resized inside a layout frame', () => {
    setTextMeasurer(() => ({ width: 500, height: 80 }))
    const { graph, page } = scene()
    const row = graph.createNode('FRAME', page, {
      layoutMode: 'HORIZONTAL',
      width: 300,
      height: 100,
      primaryAxisSizing: 'FIXED'
    })
    const text = graph.createNode('TEXT', page, {
      text: 'moves into the row',
      fontSize: 12,
      textAutoResize: 'TRUNCATE',
      width: 60,
      height: 20
    }) as SceneNode
    graph.insertChildAt(text.id, row.id, 0)
    expect([graph.getNode(text.id)?.width, graph.getNode(text.id)?.height]).toEqual([60, 20])
    computeAllLayouts(graph)
    expect([graph.getNode(text.id)?.width, graph.getNode(text.id)?.height]).toEqual([60, 20])
  })
})
