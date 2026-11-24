import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { formatVariableFormula, parseVariableFormula } from '@pairdraw/scene-graph/variables/formula'

const RED = { r: 1, g: 0, b: 0, a: 1 }

test('a collection lists a variable while it is live, not once its deleted record replaces it', () => {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Colors')
  const accent = graph.createVariable('Accent', 'COLOR', collection.id, RED)
  graph.addVariable({ ...accent, deleted: true })
  expect(collection.variableIds).toEqual([])
  graph.addVariable(accent)
  expect(collection.variableIds).toEqual([accent.id])
})

test('a deleted variable stays resolvable by ID but leaves every list', () => {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Colors')
  const accent = graph.createVariable('Accent', 'COLOR', collection.id, RED)
  const old = graph.createVariable('Old accent', 'COLOR', collection.id, {
    r: 0,
    g: 0,
    b: 1,
    a: 1
  })
  graph.addVariable({ ...old, deleted: true })

  expect(graph.getLiveVariables().map((variable) => variable.name)).toEqual(['Accent'])
  expect(graph.getVariablesByType('COLOR').map((variable) => variable.name)).toEqual(['Accent'])
  expect(graph.resolveColorVariable(old.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  expect(graph.variables.get(accent.id)?.deleted).toBeUndefined()
})

test('a deleted collection takes its variables out of the lists, but not out of reach', () => {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Colors')
  const accent = graph.createVariable('Accent', 'COLOR', collection.id, RED)
  graph.addCollection({ ...collection, deleted: true })

  expect(graph.getLiveCollections()).toEqual([])
  expect(graph.getLiveVariables()).toEqual([])
  expect(graph.variableCollections.get(collection.id)?.deleted).toBe(true)
  expect(graph.variables.get(accent.id)?.name).toBe('Accent')
  expect(graph.resolveColorVariable(accent.id)).toEqual(RED)
})

test('removing a collection removes the variables deleted before it', () => {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Colors')
  const accent = graph.createVariable('Accent', 'COLOR', collection.id, RED)
  graph.addVariable({ ...accent, deleted: true })
  graph.removeCollection(collection.id)

  expect(graph.variables.size).toBe(0)
  expect(graph.variableCollections.size).toBe(0)
})

function formulaSetup() {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Tokens')
  const base = graph.createVariable('base', 'FLOAT', collection.id, 4)
  const derived = graph.createVariable('derived', 'FLOAT', collection.id, 0)
  const mode = collection.defaultModeId
  const parse = (source: string) => parseVariableFormula(graph, derived.id, mode, source)
  const set = (source: string) => {
    derived.valuesByMode[mode] = parse(source).value
  }
  return { graph, collection, base, derived, mode, parse, set }
}

test('a deleted variable is referenced by its ID, even beside a live one of its name', () => {
  const { graph, collection, base, derived, mode, parse, set } = formulaSetup()
  set('{base} * 2')
  graph.addVariable({ ...base, deleted: true })
  graph.createVariable('base', 'FLOAT', collection.id, 100)

  const text = formatVariableFormula(graph, derived.valuesByMode[mode])
  expect(text).toContain(`{#${base.id}}`)
  expect(parse(text).resolved).toBe(8)
})

test('an ID names its variable before a variable named like that ID', () => {
  const { graph, collection, base, derived, mode, parse, set } = formulaSetup()
  set('{base} * 2')
  graph.createVariable(`#${base.id}`, 'FLOAT', collection.id, 100)

  const text = formatVariableFormula(graph, derived.valuesByMode[mode])
  expect(parse(text).resolved).toBe(8)
  expect(parse(`{#${base.id}} * 2`).resolved).toBe(8)
})

test('a name that would read as an ID is never printed bare', () => {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Tokens')
  const odd = graph.createVariable('#1:2', 'FLOAT', collection.id, 3)
  const derived = graph.createVariable('derived', 'FLOAT', collection.id, 0)
  const mode = collection.defaultModeId
  derived.valuesByMode[mode] = { aliasId: odd.id }

  const text = formatVariableFormula(graph, derived.valuesByMode[mode])
  // A bare `{name}` would be read as an ID; the qualified name is not.
  expect(text).not.toBe(`{${odd.name}}`)
  expect(parseVariableFormula(graph, derived.id, mode, text).resolved).toBe(3)
})
