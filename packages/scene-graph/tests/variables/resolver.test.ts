import { expect, test } from 'bun:test'

import { SceneGraph, type VariableValue } from '@pairdraw/scene-graph'
import {
  createVariableResolver,
  parseVariableFormula,
  VariableResolutionError
} from '@pairdraw/scene-graph/variables'

function setup() {
  const graph = new SceneGraph()
  const colors = graph.createCollection('Colors')
  const spacing = graph.createCollection('Spacing')
  graph.addMode(colors.id, 'dark', 'Dark')
  const red = graph.createVariable('Red', 'COLOR', colors.id, { r: 1, g: 0, b: 0, a: 1 })
  const blue = graph.createVariable('Blue', 'COLOR', colors.id, { r: 0, g: 0, b: 1, a: 1 })
  const gap = graph.createVariable('Gap', 'FLOAT', spacing.id, 8)
  const label = graph.createVariable('Label', 'STRING', spacing.id, 'Regular')
  const shown = graph.createVariable('Shown', 'BOOLEAN', spacing.id, true)
  return { graph, colors, spacing, red, blue, gap, label, shown }
}

test('one reader returns any literal type and typed getters filter it', () => {
  const { graph, red, gap, label, shown } = setup()
  const reader = createVariableResolver(graph).active()
  expect(reader.value(red.id)).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  expect(reader.value(gap.id)).toBe(8)
  expect(reader.value(label.id)).toBe('Regular')
  expect(reader.value(shown.id)).toBe(true)
  expect(reader.color(red.id)).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  expect(reader.color(gap.id)).toBeUndefined()
  expect(reader.number(gap.id)).toBe(8)
  expect(reader.number(label.id)).toBeUndefined()
  expect(reader.string(label.id)).toBe('Regular')
  expect(reader.boolean(shown.id)).toBe(true)
  expect(reader.boolean(gap.id)).toBeUndefined()
})

test('aliases and formulas resolve through one reader and cache', () => {
  const { graph, spacing, red, gap } = setup()
  const alias = graph.createVariable('Alias', 'COLOR', spacing.id, { aliasId: red.id })
  const derived = graph.createVariable('Derived', 'FLOAT', spacing.id, 0)
  derived.valuesByMode[spacing.defaultModeId] = parseVariableFormula(
    graph,
    derived.id,
    spacing.defaultModeId,
    '{Gap} * 2 + 1'
  ).value
  const reader = createVariableResolver(graph).active()
  expect(reader.color(alias.id)).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  expect(reader.number(derived.id)).toBe(17)
  expect(reader.number(derived.id)).toBe(17)
  gap.valuesByMode[spacing.defaultModeId] = 10
  expect(reader.number(derived.id)).toBe(17)
  expect(createVariableResolver(graph).active().number(derived.id)).toBe(21)
})

test('nodes resolve each collection in its nearest ancestor mode', () => {
  const { graph, colors, spacing, red, blue, gap } = setup()
  graph.addMode(spacing.id, 'roomy', 'Roomy')
  red.valuesByMode.dark = { r: 0, g: 0, b: 1, a: 1 }
  gap.valuesByMode.roomy = 24
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    variableModes: { [colors.id]: 'dark', [spacing.id]: 'roomy' }
  })
  const child = graph.createNode('RECTANGLE', frame.id)
  const resolver = createVariableResolver(graph)
  expect(resolver.forNode(child.id).color(red.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  expect(resolver.forNode(child.id).number(gap.id)).toBe(24)
  expect(resolver.modeFor(child.id, colors.id)).toBe('dark')
  expect(resolver.explicitModeFor(child.id, colors.id)).toBe('dark')
  expect(resolver.modesFor(child.id)).toEqual({ [colors.id]: 'dark', [spacing.id]: 'roomy' })
  expect(resolver.forNode(frame.id).color(blue.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
})

test('active, explicit collection mode, and default fallback stay distinct', () => {
  const { graph, colors, spacing, red, gap } = setup()
  red.valuesByMode.dark = { r: 0, g: 0, b: 1, a: 1 }
  graph.setActiveMode(colors.id, 'dark')
  const resolver = createVariableResolver(graph)
  expect(resolver.activeMode(colors.id)).toBe('dark')
  expect(resolver.active().color(red.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  expect(resolver.forMode(colors.id, colors.defaultModeId).color(red.id)).toEqual({
    r: 1,
    g: 0,
    b: 0,
    a: 1
  })
  const child = graph.createNode('RECTANGLE', graph.getPages()[0].id)
  expect(resolver.forNode(child.id, 'default').color(red.id)).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  expect(resolver.forNode(child.id, 'active').color(red.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  expect(resolver.forMode(spacing.id, spacing.defaultModeId).number(gap.id)).toBe(8)
})

test('stored values do not fall back to the default mode and still follow aliases', () => {
  const { graph, colors, spacing, red } = setup()
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    variableModes: { [colors.id]: 'dark', [spacing.id]: spacing.defaultModeId }
  })
  const child = graph.createNode('RECTANGLE', frame.id)
  delete red.valuesByMode.dark
  const reader = createVariableResolver(graph).forNode(child.id)
  expect(reader.value(red.id)).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  expect(reader.stored(red.id)).toBeUndefined()
  red.valuesByMode.dark = { r: 1, g: 1, b: 0, a: 1 }
  expect(reader.stored(red.id)).toEqual({ r: 1, g: 1, b: 0, a: 1 })
  const alias = graph.createVariable('Alias', 'COLOR', spacing.id, { aliasId: red.id })
  alias.valuesByMode[spacing.defaultModeId] = { aliasId: red.id }
  expect(createVariableResolver(graph).forNode(child.id).stored(alias.id)).toEqual({
    r: 1,
    g: 1,
    b: 0,
    a: 1
  })
})

test('strict resolution names cycle, missing, type, and non-finite failures', () => {
  const { graph, colors, spacing, red, gap, label } = setup()
  const reader = createVariableResolver(graph).active()
  expect(() => reader.resolve('missing')).toThrow(VariableResolutionError)
  red.valuesByMode[colors.defaultModeId] = { aliasId: red.id }
  expect(() => reader.resolve(red.id)).toThrow('Circular variable reference')
  expect(reader.value(red.id)).toBeUndefined()

  gap.valuesByMode[spacing.defaultModeId] = Infinity
  expect(() => createVariableResolver(graph).active().resolve(gap.id)).toThrow(
    'Non-finite value: Gap'
  )
  expect(createVariableResolver(graph).active().value(gap.id)).toBeUndefined()

  const wrong = graph.createVariable('Wrong', 'FLOAT', spacing.id, { aliasId: label.id })
  expect(() => createVariableResolver(graph).active().resolve(wrong.id)).toThrow(
    'Wrong result type: Wrong'
  )
  expect(createVariableResolver(graph).active().value(wrong.id)).toBeUndefined()

  const empty = graph.createVariable('Empty', 'FLOAT', spacing.id, 1)
  empty.valuesByMode = {}
  expect(() => createVariableResolver(graph).active().resolve(empty.id)).toThrow(
    'Missing value: Empty'
  )
})

test('an alias chain deeper than the formula limit is refused', () => {
  const { graph, spacing, red } = setup()
  let previous = red.id
  for (let index = 0; index < 66; index++) {
    const next = graph.createVariable(`Chain ${index}`, 'COLOR', spacing.id, {
      aliasId: previous
    })
    previous = next.id
  }
  const reader = createVariableResolver(graph).active()
  expect(() => reader.resolve(previous)).toThrow('Too many linked variables')
  expect(reader.value(previous)).toBeUndefined()
})

test('a draft override resolves through formulas without changing stored values', () => {
  const { graph, spacing, gap } = setup()
  const derived = graph.createVariable('Derived', 'FLOAT', spacing.id, 0)
  derived.valuesByMode[spacing.defaultModeId] = parseVariableFormula(
    graph,
    derived.id,
    spacing.defaultModeId,
    '{Gap} * 2'
  ).value
  const overrides = new Map<string, VariableValue>([[gap.id, 5]])
  const resolver = createVariableResolver(graph, { overrides })
  expect(resolver.active().resolve(derived.id)).toBe(10)
  expect(createVariableResolver(graph).active().resolve(derived.id)).toBe(16)
})

test('dependencies include aliases and formula references in every mode', () => {
  const { graph, colors, spacing, red } = setup()
  const alias = graph.createVariable('Alias', 'COLOR', spacing.id, { aliasId: red.id })
  const derived = graph.createVariable('Derived', 'FLOAT', spacing.id, 0)
  graph.createVariable('DerivedBase', 'FLOAT', colors.id, 2)
  derived.valuesByMode[spacing.defaultModeId] = parseVariableFormula(
    graph,
    derived.id,
    spacing.defaultModeId,
    '{DerivedBase} + {Gap}'
  ).value
  const deps = createVariableResolver(graph).dependencies([alias.id, derived.id])
  expect(deps).toEqual(new Set([colors.id, spacing.id]))
})

test('readers keep separate caches per node and mode', () => {
  const { graph, spacing, gap } = setup()
  graph.addMode(spacing.id, 'large', 'Large')
  gap.valuesByMode.large = 40
  const one = graph.createNode('FRAME', graph.getPages()[0].id, {
    variableModes: { [spacing.id]: spacing.defaultModeId }
  })
  const two = graph.createNode('FRAME', graph.getPages()[0].id, {
    variableModes: { [spacing.id]: 'large' }
  })
  const resolver = createVariableResolver(graph)
  expect(resolver.forNode(one.id).number(gap.id)).toBe(8)
  expect(resolver.forNode(two.id).number(gap.id)).toBe(40)
  expect(resolver.forNode(one.id).number(gap.id)).toBe(8)
  expect(createVariableResolver(graph).forNode(two.id).number(gap.id)).toBe(40)
})
