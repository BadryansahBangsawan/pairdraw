import { describe, expect, test } from 'bun:test'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import { computeLayout } from '#core/layout'

/** A fixed 300 × 300 frame, padded 10 on every side, around three 30 × 30 rectangles. */
function spreadFrame(fields: Partial<SceneNode>) {
  const graph = new SceneGraph()
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    width: 300,
    height: 300,
    layoutMode: 'HORIZONTAL',
    primaryAxisSizing: 'FIXED',
    counterAxisSizing: 'FIXED',
    primaryAxisAlign: 'SPACE_AROUND',
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    ...fields
  })
  for (const name of ['a', 'b', 'c']) {
    graph.createNode('RECTANGLE', frame.id, { name, width: 30, height: 30 })
  }
  computeLayout(graph, frame.id)
  return graph.getChildren(frame.id)
}

describe('space around', () => {
  test('gives each child an equal share of the free space, half on each side', () => {
    // 280 inside the padding, 190 of it free: 63⅓ per child, 31⅔ on each side.
    const [a, b, c] = spreadFrame({})
    expect(a.x).toBeCloseTo(41.67, 1)
    expect(b.x).toBeCloseTo(135, 1)
    expect(c.x).toBeCloseTo(228.33, 1)
  })

  test('keeps the gap and shares only the space left after it, vertically too', () => {
    // 280 − 90 − 2 × 20 leaves 150: 25 on each side of each child.
    const [a, b, c] = spreadFrame({ layoutMode: 'VERTICAL', itemSpacing: 20 })
    expect([a.y, b.y, c.y]).toEqual([35, 135, 235])
  })

  test('centers a single child', () => {
    const graph = new SceneGraph()
    const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
      width: 200,
      height: 40,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      primaryAxisAlign: 'SPACE_AROUND'
    })
    const only = graph.createNode('RECTANGLE', frame.id, { width: 40, height: 40 })
    computeLayout(graph, frame.id)
    expect(graph.getNode(only.id)?.x).toBe(80)
  })
})
