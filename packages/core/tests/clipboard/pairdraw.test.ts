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

describe('Pairdraw clipboard fields the graph reads', () => {
  const solid = { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
  const pasted = (fields: Record<string, unknown>) =>
    parsePairdrawClipboard(
      clipboardHTML(
        JSON.stringify({
          format: 'pairdraw/v1',
          nodes: [{ id: '0:1', type: 'RECTANGLE', name: 'Card', x: 0, y: 0, ...fields }]
        })
      )
    )?.nodes[0]

  test.each([
    ['fills', 5],
    ['fills', [null]],
    ['strokes', 5],
    ['effects', 5],
    ['source', 5],
    ['source', { format: 'fig', id: null, orderKey: null, editedFields: 5, fig: {} }]
  ])('drops malformed %s %j and keeps the layer', (key, value) => {
    const node = pasted({ [key]: value, opacity: 0.5 })
    expect(node).toMatchObject({ id: '0:1', name: 'Card', opacity: 0.5 })
    expect(node && Object.hasOwn(node, key)).toBe(false)
  })

  test('keeps well-formed paints with their key order', () => {
    const node = pasted({ fills: [solid], strokes: [solid], effects: [] })
    expect<unknown>(node?.fills).toEqual([solid])
    expect(node && Object.keys(node.fills[0])).toEqual(Object.keys(solid))
    expect<unknown>(node?.strokes).toEqual([solid])
  })

  test('drops malformed fills inside geometry', () => {
    const node = pasted({
      type: 'VECTOR',
      fillGeometry: [{ windingRule: 'NONZERO', commandsBlob: { 0: 1 }, fills: 5 }]
    })
    expect(node?.fillGeometry).toHaveLength(1)
    expect(node && Object.hasOwn(node.fillGeometry[0], 'fills')).toBe(false)
  })

  test('gives strokes from older payloads without a type a solid type', () => {
    const { type: _type, ...untyped } = solid
    expect<unknown>(pasted({ strokes: [untyped] })?.strokes).toEqual([
      { ...untyped, type: 'SOLID' }
    ])
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
