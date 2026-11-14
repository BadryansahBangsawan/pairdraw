import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { computeAllLayouts } from '#core/layout'

// Hug and Fill have no size of their own to fall back to in `.fig`, so a fallback is a minimum or
// maximum size, which `.pen` import also maps `fit_content(N)` to.
describe('min and max sizes as the Hug and Fill fallback', () => {
  function hugFrame(children: number) {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      minWidth: 120,
      minHeight: 80
    })
    for (let index = 0; index < children; index++)
      graph.createNode('RECTANGLE', frame.id, { width: 200, height: 100 })
    computeAllLayouts(graph, pageId)
    const laidOut = graph.getNode(frame.id)
    return [laidOut?.width, laidOut?.height]
  }

  function fillChild(limits: { minWidth?: number; maxWidth?: number }, rowWidth = 400) {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const row = graph.createNode('FRAME', pageId, {
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED',
      width: rowWidth,
      height: 50
    })
    const child = graph.createNode('RECTANGLE', row.id, {
      width: 40,
      height: 40,
      layoutGrow: 1,
      ...limits
    })
    computeAllLayouts(graph, pageId)
    return graph.getNode(child.id)?.width
  }

  test('sizes an empty Hug frame to its minimum', () => {
    expect(hugFrame(0)).toEqual([120, 80])
  })

  test('lets Hug content larger than the minimum decide the size', () => {
    expect(hugFrame(1)).toEqual([200, 100])
  })

  test('caps a Fill child at its maximum', () => {
    expect(fillChild({ maxWidth: 150 })).toBe(150)
    expect(fillChild({})).toBe(400)
  })

  test('keeps a Fill child at its minimum when the parent is narrower', () => {
    expect(fillChild({ minWidth: 150 }, 100)).toBe(150)
  })
})
