import { describe, expect, test } from 'bun:test'

import { documentColors } from '@pairdraw/core/editor'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

const RED: Color = { r: 1, g: 0, b: 0, a: 1 }
const BLUE: Color = { r: 0, g: 0, b: 1, a: 1 }

function solid(color: Color): Fill {
  return { type: 'SOLID', color, opacity: 1, visible: true }
}

/** A graph with one page and the rectangle the paints go on. */
function page() {
  const graph = new SceneGraph()
  return { graph, pageId: graph.getPages()[0].id }
}

describe('documentColors', () => {
  test('lists each solid fill and stroke once, most used first', () => {
    const { graph, pageId } = page()
    graph.createNode('RECTANGLE', pageId, { fills: [solid(RED), solid(BLUE)] })
    graph.createNode('RECTANGLE', pageId, { fills: [solid(RED)] })
    graph.createNode('ELLIPSE', pageId, {
      fills: [],
      strokes: [{ ...solid(RED), weight: 1, align: 'INSIDE' } as never]
    })

    expect(documentColors(graph, pageId)).toEqual([
      { color: RED, count: 3 },
      { color: BLUE, count: 1 }
    ])
  })

  test('skips hidden layers and everything under a hidden ancestor', () => {
    const { graph, pageId } = page()
    const group = graph.createNode('GROUP', pageId, { fills: [] })
    graph.createNode('RECTANGLE', group.id, { fills: [solid(BLUE)] })
    graph.updateNode(group.id, { visible: false })
    graph.createNode('RECTANGLE', pageId, { visible: false, fills: [solid(BLUE)] })
    graph.createNode('RECTANGLE', pageId, { fills: [solid(RED)] })

    expect(documentColors(graph, pageId)).toEqual([{ color: RED, count: 1 }])
  })

  test('leaves out paints bound to a variable or covered by a colour style', () => {
    const { graph, pageId } = page()
    const bound = graph.createNode('RECTANGLE', pageId, { fills: [solid(BLUE)] })
    graph.updateNode(bound.id, { boundVariables: { 'fills/0/color': 'variable-1' } })
    graph.createNode('RECTANGLE', pageId, { fills: [solid(BLUE)], fillStyleId: 'style-1' })
    graph.createNode('RECTANGLE', pageId, { fills: [solid(RED)] })

    expect(documentColors(graph, pageId)).toEqual([{ color: RED, count: 1 }])
  })

  test('counts gradients only through their solid fills, not their stops', () => {
    const { graph, pageId } = page()
    graph.createNode('RECTANGLE', pageId, {
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          color: RED,
          opacity: 1,
          visible: true,
          gradientStops: [{ position: 0, color: BLUE }],
          gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
        }
      ]
    })

    expect(documentColors(graph, pageId)).toEqual([])
  })

  test('keeps colours distinct by alpha', () => {
    const { graph, pageId } = page()
    graph.createNode('RECTANGLE', pageId, { fills: [solid({ ...RED, a: 0.5 })] })
    graph.createNode('RECTANGLE', pageId, { fills: [solid(RED)] })

    expect(documentColors(graph, pageId)).toHaveLength(2)
  })

  test('caps the list at 48 colours', () => {
    const { graph, pageId } = page()
    for (let index = 0; index < 50; index++) {
      const color = { r: index / 50, g: 0.5, b: 0.5, a: 1 }
      graph.createNode('RECTANGLE', pageId, { fills: [solid(color)] })
    }

    expect(documentColors(graph, pageId)).toHaveLength(48)
  })

  test('lists only the page it is asked for', () => {
    const { graph, pageId } = page()
    const other = graph.addPage('Other').id
    graph.createNode('RECTANGLE', other, { fills: [solid(BLUE)] })
    graph.createNode('RECTANGLE', pageId, { fills: [solid(RED)] })

    expect(documentColors(graph, pageId)).toEqual([{ color: RED, count: 1 }])
  })
})
