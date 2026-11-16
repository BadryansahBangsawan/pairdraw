import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { computeAbsoluteBounds } from '@pairdraw/scene-graph/geometry'

function rotatedRect() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const rect = graph.createNode('RECTANGLE', page.id, {
    x: 100,
    y: 100,
    width: 100,
    height: 50,
    rotation: 45
  })
  return { graph, rect }
}

describe('computeAbsoluteBounds', () => {
  test('covers every corner of a rotated layer', () => {
    const { graph, rect } = rotatedRect()
    const b = computeAbsoluteBounds([rect], graph)
    const half = 75 * Math.SQRT1_2
    expect(b.x).toBeCloseTo(150 - half)
    expect(b.y).toBeCloseTo(125 - half)
    expect(b.width).toBeCloseTo(2 * half)
    expect(b.height).toBeCloseTo(2 * half)
  })

  test('keeps an unrotated layer at its box', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, { x: 10, y: 20, width: 30, height: 40 })
    expect(computeAbsoluteBounds([rect], graph)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  })
})
