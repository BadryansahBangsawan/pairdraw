import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { parseColor } from '@pairdraw/scene-graph/color'
import { PAIRDRAW_PLUGIN_DATA, withPluginData } from '@pairdraw/scene-graph/plugin-data'

import { materializeScriptError, materializeScriptOutput } from '@/app/code/script/materialize'
import {
  readScriptNodeData,
  runScriptNode,
  scriptChangeNeedsRun,
  scriptInputValues
} from '@/app/code/script/run-node'
import type { ScriptNodeSpec } from '@/app/code/script/sandbox/spec'

const { script: SCRIPT_FIELD } = PAIRDRAW_PLUGIN_DATA
/** The error placeholder's text color, as the materializer draws it. */
const ERROR_COLOR = '#d93036'

/** A graph with one page and a SCRIPT node whose program is `source`. */
function scriptGraph(source: string, inputs?: Record<string, unknown>) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const node = graph.createNode('SCRIPT', page.id, { name: 'Card', width: 200, height: 200 })
  graph.updateNode(node.id, {
    pluginData: withPluginData(node.pluginData, SCRIPT_FIELD, {
      version: 1,
      source,
      inputs: inputs as never
    })
  })
  return { graph, page, node }
}

/** The node `id` names, so a test fails on the assertion, not on a missing layer. */
function nodeOf(graph: SceneGraph, id: string) {
  const node = graph.getNode(id)
  if (!node) throw new Error(`No node ${id}.`)
  return node
}
function childTypes(graph: SceneGraph, parentId: string): string[] {
  return (graph.getNode(parentId)?.childIds ?? []).map((id) => graph.getNode(id)?.type ?? 'MISSING')
}

describe('drawing a script run', () => {
  test('draws roots in order with their fills, text, and corner radius', () => {
    const { graph, page, node } = scriptGraph('return []')
    const roots: ScriptNodeSpec[] = [
      { type: 'RECTANGLE', name: 'Card', x: 0, y: 0, width: 120, height: 80, fill: '#ff0000' },
      {
        type: 'FRAME',
        x: 0,
        y: 100,
        width: 200,
        height: 60,
        layout: 'HORIZONTAL',
        gap: 8,
        padding: 12,
        children: [
          {
            type: 'ROUNDED_RECTANGLE',
            width: 40,
            height: 40,
            radius: 6,
            fill: '#00ff00',
            stroke: '#000000',
            strokeWeight: 1
          },
          { type: 'TEXT', text: 'Hello', fontSize: 14, fontWeight: 600 }
        ]
      }
    ]
    const result = materializeScriptOutput(graph, node.id, roots, page.id)
    expect(result.nodeCount).toBe(4)
    expect(childTypes(graph, node.id)).toEqual(['RECTANGLE', 'FRAME'])
    const frame = nodeOf(graph, result.rootIds[1])
    // A rounded rectangle is a rectangle with a corner radius, as the graph stores it.
    expect(childTypes(graph, frame.id)).toEqual(['RECTANGLE', 'TEXT'])
    const card = nodeOf(graph, result.rootIds[0])
    expect(card.fills[0]).toMatchObject({ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } })
    expect(graph.getNode(frame.childIds[0])?.cornerRadius).toBe(6)
    expect(graph.getNode(frame.childIds[1])).toMatchObject({
      type: 'TEXT',
      text: 'Hello',
      fontSize: 14,
      fontWeight: 600
    })
    expect(frame).toMatchObject({ layoutMode: 'HORIZONTAL', itemSpacing: 8, paddingLeft: 12 })
  })

  test('replaces the previous run instead of stacking layers', () => {
    const { graph, page, node } = scriptGraph('return []')
    materializeScriptOutput(graph, node.id, [{ type: 'RECTANGLE', width: 10, height: 10 }], page.id)
    const second = materializeScriptOutput(
      graph,
      node.id,
      [{ type: 'ELLIPSE', width: 10, height: 10 }],
      page.id
    )
    expect(childTypes(graph, node.id)).toEqual(['ELLIPSE'])
    expect(
      [...graph.getAllNodes()].filter((candidate) => candidate.type === 'RECTANGLE')
    ).toHaveLength(0)
    expect(second.nodeCount).toBe(1)
  })

  test('draws a failed run as an error placeholder on the script node', () => {
    const { graph, node } = scriptGraph('return []')
    const frameId = materializeScriptError(graph, node.id, 'Script timed out.')
    const frame = nodeOf(graph, frameId)
    expect(frame.name).toBe('Script error')
    const text = nodeOf(graph, frame.childIds[0])
    expect(text).toMatchObject({ type: 'TEXT', text: 'Script timed out.' })
    expect(text.fills[0]).toMatchObject({ type: 'SOLID', color: parseColor(ERROR_COLOR) })
  })

  test('replaces the previous output instead of stacking the error on it', () => {
    const { graph, page, node } = scriptGraph('return []')
    materializeScriptOutput(graph, node.id, [{ type: 'RECTANGLE', width: 10, height: 10 }], page.id)
    materializeScriptError(graph, node.id, 'First.')
    const frameId = materializeScriptError(graph, node.id, 'Second.')

    expect(childTypes(graph, node.id)).toEqual(['FRAME'])
    expect(nodeOf(graph, nodeOf(graph, frameId).childIds[0]).text).toBe('Second.')
  })
})

describe('running a script node', () => {
  test('draws the layers the sandbox returns and reports their count', async () => {
    const { graph, page, node } = scriptGraph('return pencil.rect({ width: 10, height: 10 })')
    const result = await runScriptNode(graph, node.id, page.id, {
      evaluate: async () => ({ ok: true, roots: [{ type: 'RECTANGLE', width: 10, height: 10 }] })
    })
    expect(result).toMatchObject({ ok: true, nodeCount: 1 })
    expect(childTypes(graph, node.id)).toEqual(['RECTANGLE'])
  })

  test('passes the stored inputs and a seed from the node to the run', async () => {
    const { graph, page, node } = scriptGraph('return []', { title: 'Card' })
    let seen: { inputs?: Record<string, unknown>; seed?: number } = {}
    await runScriptNode(graph, node.id, page.id, {
      evaluate: async (_source, options) => {
        seen = options
        return { ok: true, roots: [] }
      }
    })
    expect(seen.inputs).toEqual({ title: 'Card' })
    expect(seen.seed).toBe(scriptSeedValue(node.id, 'return []'))
  })

  test('draws the error and keeps no layers when the sandbox fails', async () => {
    const { graph, page, node } = scriptGraph('throw new Error("boom")')
    const result = await runScriptNode(graph, node.id, page.id, {
      evaluate: async () => ({ ok: false, error: 'Script timed out.' })
    })
    expect(result).toEqual({ ok: false, error: 'Script timed out.' })
    const errorFrame = nodeOf(graph, node.id)
      .childIds.map((id) => nodeOf(graph, id))
      .find((child) => child.name === 'Script error')
    expect(errorFrame).toBeDefined()
  })

  test('refuses a node that is not a script or has no code', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id)
    expect(await runScriptNode(graph, rect.id, page.id)).toEqual({
      ok: false,
      error: 'Not a script node.'
    })
    const empty = graph.createNode('SCRIPT', page.id)
    expect(await runScriptNode(graph, empty.id, page.id)).toEqual({
      ok: false,
      error: 'This script node has no code.'
    })
  })
})

describe('inputs bound to document variables', () => {
  /** The same node, with `name` bound to `variableId` in its script data. */
  function bind(graph: SceneGraph, nodeId: string, name: string, variableId: string) {
    const data = readScriptNodeData(graph, nodeId)
    if (!data) throw new Error('No script data.')
    graph.updateNode(nodeId, {
      pluginData: withPluginData(nodeOf(graph, nodeId).pluginData, SCRIPT_FIELD, {
        ...data,
        bindings: { ...data.bindings, [name]: variableId }
      })
    })
  }

  test('a bound number replaces the stored value on the host side', () => {
    const { graph, node } = scriptGraph('return []', { count: 3 })
    const collection = graph.createCollection('Tokens')
    const count = graph.createVariable('Count', 'FLOAT', collection.id, 7)
    bind(graph, node.id, 'count', count.id)
    const { values, error } = scriptInputValues(graph, node.id, new Map([['count', 'number']]))
    expect(error).toBeUndefined()
    expect(values).toEqual({ count: 7 })
  })

  test('the bound value reaches the run and refuses a mismatched variable', async () => {
    const { graph, page, node } = scriptGraph('return []')
    const collection = graph.createCollection('Tokens')
    const label = graph.createVariable('Label', 'STRING', collection.id, 'Hello')
    const ratio = graph.createVariable('Ratio', 'FLOAT', collection.id, 0.5)
    bind(graph, node.id, 'label', label.id)
    let inputs: Record<string, unknown> = {}
    await runScriptNode(graph, node.id, page.id, {
      evaluate: async (_source, options) => {
        inputs = options.inputs ?? {}
        return { ok: true, roots: [] }
      }
    })
    expect(inputs).toEqual({ label: 'Hello' })

    bind(graph, node.id, 'label', ratio.id)
    expect(scriptInputValues(graph, node.id, new Map([['label', 'string']]))).toMatchObject({
      error: 'Variable for "label" does not match its string input.'
    })
  })

  test('an unbound input keeps its stored value and a missing variable is reported', () => {
    const { graph, node } = scriptGraph('return []', { title: 'Card', size: 12 })
    const collection = graph.createCollection('Tokens')
    const size = graph.createVariable('Size', 'FLOAT', collection.id, 24)
    bind(graph, node.id, 'size', size.id)
    bind(graph, node.id, 'title', 'missing-variable')
    const { values, error } = scriptInputValues(
      graph,
      node.id,
      new Map([
        ['title', 'string'],
        ['size', 'number']
      ])
    )
    expect(values).toEqual({ title: 'Card', size: 24 })
    expect(error).toBe('Variable for "title" has no value.')
  })

  test('a resize or new inputs re-runs the script; a fill does not', () => {
    expect(scriptChangeNeedsRun({ width: 300 })).toBe(true)
    expect(scriptChangeNeedsRun({ height: 300 })).toBe(true)
    expect(scriptChangeNeedsRun({ pluginData: [] })).toBe(true)
    expect(scriptChangeNeedsRun({ fills: [] })).toBe(false)
    expect(scriptChangeNeedsRun({ x: 10 })).toBe(false)
  })
})

/** The seed `runScriptNode` derives, so a test states it rather than reading it back. */
function scriptSeedValue(nodeId: string, source: string): number {
  let hash = 0x811c9dc5
  for (const text of [nodeId, '\u0000', source]) {
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index)
      hash = Math.imul(hash, 0x01000193)
    }
  }
  return hash >>> 0
}
