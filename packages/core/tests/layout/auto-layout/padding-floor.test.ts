import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '#core/figma-api'
import { computeAllLayouts } from '#core/layout'
import { SceneGraph, type SceneNode, type Stroke } from '@pairdraw/scene-graph'

const PADDING = {
  paddingTop: 15,
  paddingRight: 20,
  paddingBottom: 15,
  paddingLeft: 20
} as const

function padded(graph: SceneGraph, mode: NonNullable<SceneNode['layoutMode']>, overrides: Partial<SceneNode> = {}) {
  return graph.createNode('FRAME', graph.getPages()[0].id, {
    layoutMode: mode,
    width: 10,
    height: 10,
    primaryAxisSizing: 'FIXED',
    counterAxisSizing: 'FIXED',
    ...PADDING,
    ...overrides
  })
}

// Figma grows a frame no smaller than its padding, with inside strokes counted when they take room.
describe('a fixed frame grows to hold its padding', () => {
  test('a horizontal frame', () => {
    const graph = new SceneGraph()
    const frame = padded(graph, 'HORIZONTAL')
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([40, 30])
  })

  test('a vertical frame', () => {
    const graph = new SceneGraph()
    const frame = padded(graph, 'VERTICAL')
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([40, 30])
  })

  test('a grid frame', () => {
    const graph = new SceneGraph()
    const frame = padded(graph, 'GRID', {
      gridTemplateColumns: [{ sizing: 'FIXED', value: 10 }],
      gridTemplateRows: [{ sizing: 'FIXED', value: 10 }]
    })
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([40, 30])
  })

  test('a frame resized through the API', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const frame = figma.createFrame()
    frame.layoutMode = 'HORIZONTAL'
    frame.paddingLeft = frame.paddingRight = 20
    frame.paddingTop = frame.paddingBottom = 15
    frame.resize(10, 10)
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([40, 30])
  })

  test('inside strokes counted in layout also hold it open', () => {
    const graph = new SceneGraph()
    const stroke: Stroke = {
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true,
      weight: 10,
      align: 'CENTER'
    }
    const frame = padded(graph, 'HORIZONTAL', {
      width: 2,
      height: 2,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      strokesIncludedInLayout: true,
      strokes: [stroke]
    })
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([10, 10])
  })

  test('a frame larger than its padding keeps its size', () => {
    const graph = new SceneGraph()
    const frame = padded(graph, 'HORIZONTAL', { width: 100, height: 100 })
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([100, 100])
  })

  test('a frame without auto layout keeps its size', () => {
    const graph = new SceneGraph()
    const frame = padded(graph, 'NONE')
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([10, 10])
  })
})
