import { describe, expect, test } from 'bun:test'

import { guid } from '#fig-tests/helpers/guid'
import { materializeDocument } from '#fig/document/materialize'
import { EMPTY_EXPORT_RUNTIME, mapToFigmaType, sceneNodeToKiwi } from '#fig/node-change/index'

import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import { SceneGraph } from '@open-pencil/scene-graph'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  OPEN_PENCIL_PLUGIN_ID,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'

const script = JSON.stringify({
  version: 1,
  source: 'return pencil.frame({ width: 10, height: 10 })',
  inputs: { title: 'Card', count: 3, enabled: true, accent: { r: 1, g: 0, b: 0, a: 1 } }
})

const markedFrame = (extra: NodeChange): NodeChange => ({
  guid: guid(4),
  type: 'FRAME',
  name: 'Card',
  parentIndex: { guid: guid(2), position: 'a' },
  pluginData: [
    { pluginID: OPEN_PENCIL_PLUGIN_ID, key: 'nodeType', value: 'SCRIPT' },
    { pluginID: OPEN_PENCIL_PLUGIN_ID, key: 'script', value: script }
  ],
  ...extra
})

describe('SCRIPT nodes in .fig', () => {
  test('a script node exports as a frame marked in plugin data', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const node = graph.createNode('SCRIPT', page.id, {
      name: 'Card',
      pluginData: withPluginData([], OPEN_PENCIL_PLUGIN_DATA.script, JSON.parse(script))
    })
    expect(mapToFigmaType('SCRIPT')).toBe('FRAME')
    const [change] = sceneNodeToKiwi(node, guid(2), 0, { value: 2 }, graph, [], {
      nodeIdToGuid: new Map(),
      assignedGuidValues: new Set()
    })
    if (!change) throw new Error('Missing script change')
    expect(change.type).toBe('FRAME')
    const written = (key: string) =>
      change.pluginData?.find(
        (entry) => entry.pluginID === OPEN_PENCIL_PLUGIN_ID && entry.key === key
      )?.value
    expect(written(OPEN_PENCIL_PLUGIN_DATA.nodeType.key)).toBe('SCRIPT')
    expect(JSON.parse(written(OPEN_PENCIL_PLUGIN_DATA.script.key) ?? 'null')).toEqual(
      JSON.parse(script)
    )
  })

  test('a marked frame reads back as a script node with its children', () => {
    const changes: NodeChange[] = [
      { guid: guid(1), type: 'DOCUMENT' },
      {
        guid: guid(2),
        type: 'CANVAS',
        name: 'Page',
        parentIndex: { guid: guid(1), position: 'a' }
      },
      markedFrame({}),
      {
        guid: guid(5),
        type: 'RECTANGLE',
        name: 'Drawn',
        parentIndex: { guid: guid(4), position: 'a' }
      }
    ]
    const { graph } = materializeDocument(changes)
    const node = graph.getChildren(graph.getPages()[0].id)[0]
    expect(node.type).toBe('SCRIPT')
    expect(node.name).toBe('Card')
    expect(readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.script)?.source).toBe(
      'return pencil.frame({ width: 10, height: 10 })'
    )
    expect(graph.getChildren(node.id).map((child) => child.name)).toEqual(['Drawn'])
  })
})
