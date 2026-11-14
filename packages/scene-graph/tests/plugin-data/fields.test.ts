import { describe, expect, test } from 'bun:test'

import { SceneGraph, type PluginDataEntry } from '@pairdraw/scene-graph'
import {
  clearNodeFillOkHCL,
  getNodeOkHCLPayloads,
  setNodeFillOkHCL,
  setNodeStrokeOkHCL
} from '@pairdraw/scene-graph/color'
import {
  contentPluginData,
  PAIRDRAW_PLUGIN_DATA,
  PAIRDRAW_PLUGIN_ID,
  readAllPluginData,
  readPluginData,
  withPluginData
} from '@pairdraw/scene-graph/plugin-data'

const { exportSettings, okhcl, textDirection } = PAIRDRAW_PLUGIN_DATA
const OTHER_PLUGIN: PluginDataEntry = { pluginId: 'other-plugin', key: 'okhcl', value: 'theirs' }

function entry(key: string, value: string): PluginDataEntry {
  return { pluginId: PAIRDRAW_PLUGIN_ID, key, value }
}

describe('Pairdraw plugin data', () => {
  test('keeps content and other plugins’ entries as a node’s content', () => {
    const entries = [
      OTHER_PLUGIN,
      entry('textDirection', 'RTL'),
      entry('librarySource', '{}'),
      entry('okhcl', '[]')
    ]
    expect(contentPluginData(entries)).toEqual([OTHER_PLUGIN, entry('okhcl', '[]')])
  })

  test('reads entries saved under the plugin id used before the rename', () => {
    const saved = [{ pluginId: 'open-pencil', key: 'textDirection', value: 'RTL' }]
    expect(readPluginData(saved, PAIRDRAW_PLUGIN_DATA.textDirection)).toBe('RTL')
    expect(withPluginData(saved, PAIRDRAW_PLUGIN_DATA.textDirection, 'LTR')).toEqual([
      entry('textDirection', 'LTR')
    ])
  })

  test('gives every field its own key', () => {
    const keys = Object.values(PAIRDRAW_PLUGIN_DATA).map((field) => field.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('reads a value that is not JSON or has the wrong shape as missing', () => {
    for (const value of ['{not json', '{"scale":2}', '[{"scale":2,"format":"gif"}]']) {
      expect(readPluginData([entry('exportSettings', value)], exportSettings)).toBeUndefined()
    }
    expect(readPluginData([entry('textDirection', 'SIDEWAYS')], textDirection)).toBeUndefined()
    expect(readPluginData([entry('textDirection', 'RTL')], textDirection)).toBe('RTL')
  })

  test('ignores the same key written by another plugin', () => {
    const entries = [{ ...entry('textDirection', 'RTL'), pluginId: 'other-plugin' }]
    expect(readPluginData(entries, textDirection)).toBeUndefined()
  })

  test('replaces its own entry and keeps everything else', () => {
    const settings = [{ scale: 2, format: 'png' as const }]
    const entries = withPluginData(
      [entry('exportSettings', '[]'), OTHER_PLUGIN, entry('textDirection', 'LTR')],
      exportSettings,
      settings
    )
    expect(entries).toEqual([
      OTHER_PLUGIN,
      entry('textDirection', 'LTR'),
      entry('exportSettings', JSON.stringify(settings))
    ])
    expect(readPluginData(entries, exportSettings)).toEqual(settings)
    expect(withPluginData(entries, exportSettings, undefined)).toEqual(entries.slice(0, 2))
  })

  test('reads a script header with its inputs and drops a malformed one', () => {
    const { script } = PAIRDRAW_PLUGIN_DATA
    const data = {
      version: 1 as const,
      source: 'return pencil.rect({ width: 10, height: 10 })',
      inputs: { title: 'Card', count: 2, enabled: false, accent: { r: 0, g: 0, b: 1, a: 1 } }
    }
    const entries = withPluginData([], script, data)
    expect(readPluginData(entries, script)).toEqual(data)
    for (const value of [
      '{"version":2,"source":"x"}',
      '{"version":1,"source":""}',
      '{"version":1,"source":"x","inputs":{"card":null}}',
      '{"version":1,"source":"x","inputs":{"card":{"r":1,"g":0,"b":0}}}'
    ]) {
      expect(readPluginData([entry('script', value)], script)).toBeUndefined()
    }
  })

  test('picking an OkHCL color keeps the node’s other plugin data', () => {
    const graph = new SceneGraph()
    const paint = {
      type: 'SOLID' as const,
      visible: true,
      opacity: 1,
      color: { r: 1, g: 0, b: 0, a: 1 }
    }
    const node = graph.createNode('FRAME', graph.getPages()[0].id, {
      fills: [paint],
      strokes: [{ ...paint, weight: 1, align: 'INSIDE' as const }],
      pluginData: [OTHER_PLUGIN, entry('exportSettings', '[{"scale":1,"format":"png"}]')]
    })
    const color = { h: 30, c: 0.1, l: 0.6, a: 1 }

    graph.updateNode(node.id, setNodeFillOkHCL(node, 0, color))
    graph.updateNode(node.id, setNodeStrokeOkHCL(node, 0, color))
    graph.updateNode(node.id, clearNodeFillOkHCL(node, 0))

    const pluginData = graph.getNode(node.id)?.pluginData ?? []
    expect(pluginData.slice(0, 2)).toEqual([
      OTHER_PLUGIN,
      entry('exportSettings', '[{"scale":1,"format":"png"}]')
    ])
    expect(readAllPluginData(pluginData, okhcl).map(({ kind }) => kind)).toEqual(['stroke'])
    expect(getNodeOkHCLPayloads({ ...node, pluginData })).toHaveLength(1)
  })
})
