/**
 * A script's declared inputs, exercised through the store the panel and a run both use: a value
 * and a binding are document data, so each write is one undo step and sends the update a live run
 * follows from.
 */
import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import type { SceneGraph } from '@open-pencil/scene-graph'
import { createCollection, createVariable } from '@open-pencil/scene-graph/variables'

import { insertScriptNode } from '@/app/code/script/create'
import { setScriptBinding, setScriptInput } from '@/app/code/script/inputs'
import { readScriptNodeData, scriptInputValues } from '@/app/code/script/run-node'
import { declarationKinds, parseScriptHeader, inputValue } from '@/app/code/script/schema-header'
import { createEditorStore } from '@/app/editor/session/create'

let nextId = 0
const generateId = () => `id-${++nextId}`

const SOURCE = `/*
 * @schema
 * @input count number = 3
 * @input label string = "Pace"
 * @input dark boolean = true
 * @input tint color = #ff8800
 * @input mode enum(a,b) = b
 */
return [{ type: 'FRAME' }]`

function scriptNode() {
  const store = createEditorStore()
  const nodeId = insertScriptNode(store, SOURCE)
  return { store, nodeId }
}

/** A FLOAT variable in a collection, set to `value` in the default mode. */
function numberVariable(graph: SceneGraph, value: number) {
  const collection = createCollection(graph, generateId, 'Tokens')
  const variable = createVariable(graph, generateId, 'Gap', 'FLOAT', collection.id, value)
  return { variable, collection }
}

describe('declared script inputs', () => {
  test('a header declares the controls the panel shows, with defaults', () => {
    const declarations = parseScriptHeader(SOURCE)

    expect(declarations.map((declaration) => [declaration.name, declaration.kind])).toEqual([
      ['count', 'number'],
      ['label', 'string'],
      ['dark', 'boolean'],
      ['tint', 'color'],
      ['mode', 'enum']
    ])
    expect(inputValue(declarations[0], undefined)).toBe(3)
    expect(inputValue(declarations[1], undefined)).toBe('Pace')
    expect(inputValue(declarations[2], undefined)).toBe(true)
    expect(inputValue(declarations[3], undefined)).toEqual({ r: 1, g: 0x88 / 255, b: 0, a: 1 })
    // An enum without a valid default has no value until the control is set.
    expect(inputValue({ name: 'm', kind: 'enum', options: ['x', 'y'] }, undefined)).toBeUndefined()
    expect(inputValue({ name: 'm', kind: 'enum', options: ['x', 'y'] }, 'y')).toBe('y')
  })

  test('a value write is one undo step and keeps the source and other inputs', () => {
    const { store, nodeId } = scriptNode()
    setScriptInput(store, nodeId, 'count', 9)
    setScriptInput(store, nodeId, 'label', 'Lap')

    expect(readScriptNodeData(store.graph, nodeId)).toMatchObject({
      inputs: { count: 9, label: 'Lap' }
    })
    expect(readScriptNodeData(store.graph, nodeId)?.source.startsWith('/*')).toBe(true)

    store.undo.undo()

    expect(readScriptNodeData(store.graph, nodeId)?.inputs).toEqual({ count: 9 })
  })

  test('a bound variable replaces the stored value on the run', () => {
    const { store, nodeId } = scriptNode()
    setScriptInput(store, nodeId, 'count', 9)
    const { variable } = numberVariable(store.graph, 4)
    setScriptBinding(store, nodeId, 'count', variable.id)

    const { values } = scriptInputValues(store.graph, nodeId, declarationKinds(parseScriptHeader(SOURCE)))

    // The control's stored value stays for a later detach; the variable wins while bound.
    expect(values.count).toBe(4)
    expect(readScriptNodeData(store.graph, nodeId)?.inputs?.count).toBe(9)

    // The graph holds the variable it was given, so this is the edit a value control makes.
    variable.valuesByMode[Object.keys(variable.valuesByMode)[0]] = 7
    const after = scriptInputValues(store.graph, nodeId, declarationKinds(parseScriptHeader(SOURCE)))

    expect(after.values.count).toBe(7)
  })

  test('detaching keeps the last value a run used', () => {
    const { store, nodeId } = scriptNode()
    const { variable } = numberVariable(store.graph, 4)
    setScriptBinding(store, nodeId, 'count', variable.id)
    setScriptInput(store, nodeId, 'count', 4)
    setScriptBinding(store, nodeId, 'count', null)

    const { values } = scriptInputValues(store.graph, nodeId, declarationKinds(parseScriptHeader(SOURCE)))

    expect(values.count).toBe(4)
    expect(readScriptNodeData(store.graph, nodeId)?.bindings).toEqual({})
  })

  test('a variable of the wrong type is refused and names the input', () => {
    const { store, nodeId } = scriptNode()
    const { variable } = numberVariable(store.graph, 4)
    setScriptBinding(store, nodeId, 'label', variable.id)

    const { error } = scriptInputValues(store.graph, nodeId, declarationKinds(parseScriptHeader(SOURCE)))

    expect(error).toBe('Variable for "label" does not match its string input.')
  })

  test('a missing variable value is refused instead of running at a stale one', () => {
    const { store, nodeId } = scriptNode()
    setScriptBinding(store, nodeId, 'count', 'gone')

    const { error } = scriptInputValues(store.graph, nodeId, declarationKinds(parseScriptHeader(SOURCE)))

    expect(error).toBe('Variable for "count" has no value.')
  })
})