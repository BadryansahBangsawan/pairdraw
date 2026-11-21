import { describe, expect, test } from 'bun:test'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import { FigmaAPI } from '#core/figma-api'
import { computeAllLayouts } from '#core/layout'

const FR1 = { sizing: 'FR', value: 1 } as const
const AUTO = { sizing: 'AUTO', value: 0 } as const

function gridFrame(graph: SceneGraph, parentId: string, overrides: Partial<SceneNode> = {}) {
  return graph.createNode('FRAME', parentId, {
    layoutMode: 'GRID',
    width: 200,
    height: 100,
    gridTemplateColumns: [FR1, FR1],
    gridTemplateRows: [AUTO],
    gridColumnGap: 10,
    gridRowGap: 10,
    ...overrides
  })
}

function rect(graph: SceneGraph, parentId: string, width: number, height: number) {
  return graph.createNode('RECTANGLE', parentId, { width, height })
}

describe('a grid frame that hugs its contents', () => {
  test('sizes to its tracks and gap', () => {
    const graph = new SceneGraph()
    const frame = gridFrame(graph, graph.getPages()[0].id, {
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG'
    })
    rect(graph, frame.id, 40, 30)
    rect(graph, frame.id, 60, 20)
    computeAllLayouts(graph)
    // 40 + 10 gap + 60, and the tallest row's 30.
    expect([frame.width, frame.height]).toEqual([110, 30])
    expect(graph.getChildren(frame.id).map((child) => [child.x, child.y])).toEqual([
      [0, 0],
      [50, 0]
    ])
  })

  test('counts its padding', () => {
    const graph = new SceneGraph()
    const frame = gridFrame(graph, graph.getPages()[0].id, {
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      paddingTop: 5,
      paddingRight: 7,
      paddingBottom: 5,
      paddingLeft: 7
    })
    rect(graph, frame.id, 40, 30)
    computeAllLayouts(graph)
    // Both of the frame's two columns exist, so the gap between them counts too.
    expect([frame.width, frame.height]).toEqual([64, 40])
    expect(graph.getChildren(frame.id).map((child) => [child.x, child.y])).toEqual([[7, 5]])
  })

  test('clamps to its minimum and maximum', () => {
    const graph = new SceneGraph()
    const frame = gridFrame(graph, graph.getPages()[0].id, {
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      minWidth: 150,
      maxHeight: 20
    })
    rect(graph, frame.id, 40, 30)
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([150, 20])
  })

  test('shrinks when a script sets it to hug', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const frame = figma.createFrame()
    frame.layoutMode = 'GRID'
    frame.resize(200, 100)
    graph.updateNode(frame.id, {
      gridTemplateColumns: [FR1, FR1],
      gridTemplateRows: [AUTO],
      gridColumnGap: 10
    })
    const first = figma.createRectangle()
    first.resize(40, 30)
    frame.appendChild(first)
    frame.layoutSizingHorizontal = 'HUG'
    frame.layoutSizingVertical = 'HUG'
    expect(frame.layoutSizingHorizontal).toBe('HUG')
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([50, 30])
  })

  test('a second pass keeps a hugged grid at the same size', () => {
    const graph = new SceneGraph()
    const frame = gridFrame(graph, graph.getPages()[0].id, {
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG'
    })
    rect(graph, frame.id, 40, 30)
    rect(graph, frame.id, 60, 20)
    computeAllLayouts(graph)
    const once = [frame.width, frame.height]
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual(once)
  })

  test('keeps its size when it is fixed', () => {
    const graph = new SceneGraph()
    const frame = gridFrame(graph, graph.getPages()[0].id)
    rect(graph, frame.id, 40, 30)
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([200, 100])
  })
})

describe('a grid frame inside a hugging auto layout frame', () => {
  test('the parent hugs the grid’s content', () => {
    const graph = new SceneGraph()
    const row = graph.createNode('FRAME', graph.getPages()[0].id, {
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      itemSpacing: 8
    })
    const grid = graph.createNode('FRAME', row.id, {
      layoutMode: 'GRID',
      width: 10,
      height: 10,
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      gridTemplateColumns: [FR1, FR1],
      gridTemplateRows: [AUTO],
      gridColumnGap: 10
    })
    rect(graph, grid.id, 40, 30)
    rect(graph, grid.id, 60, 20)
    rect(graph, row.id, 20, 20)
    computeAllLayouts(graph)
    expect([grid.width, grid.height]).toEqual([110, 30])
    expect([row.width, row.height]).toEqual([138, 30])
  })
})
