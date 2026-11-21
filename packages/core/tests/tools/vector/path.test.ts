import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph, type VectorNetwork } from '@pairdraw/scene-graph'

const tool = (name: string) => {
  const found = ALL_TOOLS.find((t) => t.name === name)
  if (!found) throw new Error(`${name} tool missing`)
  return found
}
const pathSet = tool('path_set')

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const node = graph.createNode('VECTOR', graph.getPages()[0].id, { name: 'Path' })
  return { graph, figma, id: node.id }
}

describe('path_set', () => {
  test('writes a normalized vector network', () => {
    const { graph, figma, id } = setup()
    const path = JSON.stringify({
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      segments: [{ start: 0, end: 1 }]
    })
    expect(pathSet.execute(figma, { id, path })).toEqual({ id })
    expect(graph.getNode(id)?.vectorNetwork).toEqual({
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      segments: [{ start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }],
      regions: []
    })
  })

  test.each([
    ['malformed JSON', '{"vertices": [', 'Invalid VectorNetwork JSON'],
    ['a non-object', '42', 'Invalid VectorNetwork: network must be an object'],
    [
      'an out-of-range segment',
      JSON.stringify({ vertices: [{ x: 0, y: 0 }], segments: [{ start: 0, end: 4 }] }),
      'Invalid VectorNetwork: segment[0]: end index 4 out of range'
    ],
    [
      'a malformed tangent',
      JSON.stringify({
        vertices: [
          { x: 0, y: 0 },
          { x: 1, y: 1 }
        ],
        segments: [{ start: 0, end: 1, tangentStart: { x: 'a', y: 0 } }]
      }),
      'Invalid VectorNetwork: segment[0]: tangentStart must contain finite x and y numbers'
    ]
  ])('rejects %s without touching the node', (_label, path, error) => {
    const { graph, figma, id } = setup()
    const before = graph.getNode(id)?.vectorNetwork
    expect(pathSet.execute(figma, { id, path })).toEqual({ error })
    expect(graph.getNode(id)?.vectorNetwork).toEqual(before)
  })
})

/** A square network with an imported-style fillGeometry blob, as a .fig/SVG vector carries. */
function square(): VectorNetwork {
  return {
    vertices: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 }
    ],
    segments: [
      { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: 2, end: 3, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
      { start: 3, end: 0, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
    ],
    regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]
  }
}

function geometrySetup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const node = graph.createNode('VECTOR', graph.getPages()[0].id, {
    name: 'V',
    width: 20,
    height: 20,
    vectorNetwork: square(),
    fillGeometry: [{ windingRule: 'NONZERO', commandsBlob: new Uint8Array([1, 0, 0, 0, 0]) }],
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
  })
  return { graph, figma, id: node.id }
}

describe('a path edit keeps the box and fill geometry in step', () => {
  test('path_scale refits the box and rebuilds fillGeometry', () => {
    const { graph, figma, id } = geometrySetup()
    const before = expectDefined(graph.getNode(id)).fillGeometry[0].commandsBlob
    tool('path_scale').execute(figma, { id, factor: 2 })
    const node = expectDefined(graph.getNode(id))
    expect([node.width, node.height]).toEqual([40, 40])
    expect(expectDefined(node.vectorNetwork).vertices.map((v) => [v.x, v.y])).toEqual([
      [0, 0],
      [40, 0],
      [40, 40],
      [0, 40]
    ])
    expect(node.fillGeometry[0].commandsBlob).not.toEqual(before)
  })

  test('path_flip rebuilds fillGeometry to follow the flipped path', () => {
    const { graph, figma, id } = geometrySetup()
    const before = expectDefined(graph.getNode(id)).fillGeometry[0].commandsBlob
    tool('path_flip').execute(figma, { id, axis: 'horizontal' })
    const node = expectDefined(graph.getNode(id))
    expect(expectDefined(node.vectorNetwork).vertices.map((v) => v.x)).toEqual([20, 0, 0, 20])
    expect(node.fillGeometry[0].commandsBlob).not.toEqual(before)
  })

  test('path_move keeps the box around the moved path', () => {
    const { graph, figma, id } = geometrySetup()
    tool('path_move').execute(figma, { id, dx: 5, dy: 3 })
    const node = expectDefined(graph.getNode(id))
    expect([node.x, node.y, node.width, node.height]).toEqual([5, 3, 20, 20])
    expect(expectDefined(node.vectorNetwork).vertices.map((v) => [v.x, v.y])).toEqual([
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20]
    ])
  })

  test('path_set refits the box to the new path', () => {
    const { graph, figma, id } = geometrySetup()
    const path = JSON.stringify({
      vertices: [
        { x: 10, y: 10 },
        { x: 40, y: 10 },
        { x: 40, y: 30 }
      ],
      segments: [
        { start: 0, end: 1 },
        { start: 1, end: 2 },
        { start: 2, end: 0 }
      ],
      regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2]] }]
    })
    tool('path_set').execute(figma, { id, path })
    const node = expectDefined(graph.getNode(id))
    expect([node.width, node.height]).toEqual([30, 20])
    expect(expectDefined(node.vectorNetwork).vertices[0]).toMatchObject({ x: 0, y: 0 })
  })
})
