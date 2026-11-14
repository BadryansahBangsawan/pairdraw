import { describe, expect, test } from 'bun:test'

import { deflateSync } from 'fflate'
import { fromUint8Array } from 'js-base64'

import { buildPairdrawClipboardHTML, parsePairdrawClipboard } from '@pairdraw/core/clipboard'
import { SceneGraph } from '@pairdraw/scene-graph'
import {
  PAIRDRAW_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@pairdraw/scene-graph/plugin-data'

function clipboardHTML(payload: string): string {
  const compressed = deflateSync(new TextEncoder().encode(payload))
  return `<!--(pairdraw)${fromUint8Array(compressed)}(/pairdraw)-->`
}

function copiedNode() {
  const graph = new SceneGraph()
  const node = graph.createNode('RECTANGLE', graph.getPages()[0].id, { name: 'Card', x: 5, y: 6 })
  return { graph, node }
}

describe('Pairdraw clipboard parsing', () => {
  test('restores nodes copied by Pairdraw', () => {
    const { graph, node } = copiedNode()
    const parsed = parsePairdrawClipboard(buildPairdrawClipboardHTML([node], graph))
    expect(parsed?.nodes).toHaveLength(1)
    expect(parsed?.nodes[0]).toMatchObject({ id: node.id, type: 'RECTANGLE', name: 'Card', x: 5 })
  })

  test.each([
    ['malformed JSON', '{"format": "pairdraw/v1", "nodes": ['],
    ['an unknown format', JSON.stringify({ format: 'pairdraw/v2', nodes: [] })],
    ['non-array nodes', JSON.stringify({ format: 'pairdraw/v1', nodes: {} })],
    [
      'a node with a string coordinate',
      JSON.stringify({
        format: 'pairdraw/v1',
        nodes: [{ id: '0:1', type: 'RECTANGLE', x: '5', y: 6 }]
      })
    ],
    [
      'a node with an unknown type',
      JSON.stringify({
        format: 'pairdraw/v1',
        nodes: [{ id: '0:1', type: 'WIDGET', x: 5, y: 6 }]
      })
    ],
    [
      'a malformed child',
      JSON.stringify({
        format: 'pairdraw/v1',
        nodes: [{ id: '0:1', type: 'FRAME', x: 0, y: 0, children: [{ id: 7 }] }]
      })
    ],
    [
      'malformed geometry',
      JSON.stringify({
        format: 'pairdraw/v1',
        nodes: [{ id: '0:1', type: 'VECTOR', x: 0, y: 0, fillGeometry: [null] }]
      })
    ],
    [
      'geometry bytes outside 0-255',
      JSON.stringify({
        format: 'pairdraw/v1',
        nodes: [
          {
            id: '0:1',
            type: 'VECTOR',
            x: 0,
            y: 0,
            fillGeometry: [{ windingRule: 'NONZERO', commandsBlob: { 0: 1, 1: 300 } }]
          }
        ]
      })
    ]
  ])('ignores %s', (_label, payload) => {
    expect(parsePairdrawClipboard(clipboardHTML(payload))).toBeNull()
  })
})

describe('Pairdraw clipboard and script nodes', () => {
  test('carries a script node source through copy and paste', () => {
    const graph = new SceneGraph()
    const source = 'return pencil.frame({ width: 100 }, [])'
    const node = graph.createNode('SCRIPT', graph.getPages()[0].id, {
      name: 'Chart',
      pluginData: withPluginData([], PAIRDRAW_PLUGIN_DATA.script, { version: 1, source })
    })

    const parsed = parsePairdrawClipboard(buildPairdrawClipboardHTML([node], graph))
    const pasted = parsed?.nodes[0]

    expect(pasted).toMatchObject({ type: 'SCRIPT', name: 'Chart' })
    expect(pasted && readPluginData(pasted.pluginData, PAIRDRAW_PLUGIN_DATA.script)).toEqual({
      version: 1,
      source
    })
  })
})
