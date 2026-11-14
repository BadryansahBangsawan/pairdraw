import { describe, expect, test } from 'bun:test'

import { nodeChangeToProps, sceneNodeToKiwi } from '#fig/node-change/index'
import { readNodeChangePluginData } from '#fig/node-change/plugin-data'

import type { Fill } from '@pairdraw/scene-graph'
import { SceneGraph } from '@pairdraw/scene-graph'
import { defaultMeshPoints } from '@pairdraw/scene-graph/gradient'
import { PAIRDRAW_PLUGIN_DATA } from '@pairdraw/scene-graph/plugin-data'

const RED = { r: 1, g: 0, b: 0, a: 1 }

function meshFill(): Fill {
  return {
    type: 'MESH',
    color: RED,
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL',
    meshColumns: 1,
    meshRows: 1,
    meshPoints: defaultMeshPoints(RED)
  }
}

describe('mesh gradient .fig round trip', () => {
  test('exports a solid fallback with the grid in plugin data', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('no page')
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 10,
      height: 10,
      fills: [meshFill()]
    })
    const [change] = sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])
    if (!change) throw new Error('no change')
    expect(change.fillPaints?.[0]?.type).toBe('SOLID')
    const entries = readNodeChangePluginData(change, PAIRDRAW_PLUGIN_DATA.meshFills)
    expect(entries?.length).toBe(1)
    expect(entries?.[0]).toMatchObject({ kind: 'fill', index: 0, columns: 1, rows: 1 })
    expect(entries?.[0]?.points.length).toBe(4)
  })

  test('imports the grid back onto a mesh fill', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('no page')
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 10,
      height: 10,
      fills: [meshFill()]
    })
    const [change] = sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])
    if (!change) throw new Error('no change')
    const props = nodeChangeToProps(change, [])
    const fill = props.fills?.[0]
    expect(fill?.type).toBe('MESH')
    expect(fill?.meshColumns).toBe(1)
    expect(fill?.meshRows).toBe(1)
    expect(fill?.meshPoints?.length).toBe(4)
    expect(fill?.meshPoints?.[0]?.color).toEqual(RED)
  })

  test('an entry naming no paint keeps the solid fallback', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('no page')
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 10,
      height: 10,
      fills: [meshFill()]
    })
    const [change] = sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])
    if (!change) throw new Error('no change')
    change.fillPaints = []
    const props = nodeChangeToProps(change, [])
    expect(props.fills?.length).toBe(0)
  })
})
