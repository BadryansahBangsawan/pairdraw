import { describe, test, expect } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { computeAbsoluteBounds, computeBounds } from '@pairdraw/scene-graph/geometry'
import type { Rect } from '@pairdraw/scene-graph/primitives'

describe('computeBounds', () => {
  test('empty iterable returns zero rect', () => {
    expect(computeBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  test('single rect returns itself', () => {
    const r = { x: 10, y: 20, width: 30, height: 40 }
    expect(computeBounds([r])).toEqual(r)
  })

  test('multiple rects returns union', () => {
    const result = computeBounds([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 50, width: 100, height: 100 }
    ])
    expect(result).toEqual({ x: 0, y: 0, width: 150, height: 150 })
  })

  test('disjoint rects returns union spanning both', () => {
    const result = computeBounds([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 100, y: 100, width: 10, height: 10 }
    ])
    expect(result).toEqual({ x: 0, y: 0, width: 110, height: 110 })
  })
})

describe('computeAbsoluteBounds', () => {
  function graphWith(...rects: Rect[]) {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const nodes = rects.map((rect) => graph.createNode('RECTANGLE', pageId, rect))
    return { graph, nodes }
  }

  test('empty iterable returns zero rect', () => {
    const { graph } = graphWith()
    expect(computeAbsoluteBounds([], graph)).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  test('single node returns its bounds', () => {
    const { graph, nodes } = graphWith({ x: 10, y: 20, width: 30, height: 40 })
    expect(computeAbsoluteBounds(nodes, graph)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  })

  test('multiple nodes returns union', () => {
    const { graph, nodes } = graphWith(
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 50, y: 60, width: 20, height: 20 }
    )
    expect(computeAbsoluteBounds(nodes, graph)).toEqual({ x: 10, y: 20, width: 60, height: 60 })
  })
})
