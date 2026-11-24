import { expect, test } from 'bun:test'

import { SceneGraph, type VariableValue } from '@pairdraw/scene-graph'
import {
  collectionsResolving,
  createVariableResolver,
  getActiveModeId,
  getNodeExplicitVariableModeId,
  getNodeVariableModeId,
  parseVariableFormula,
  resolveNumberVariable,
  resolveVariable,
  resolveVariableForNode,
  resolveVariableInModes,
  resolvedVariableModes,
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

test('a mode id from another collection falls back to the collection active mode', () => {
  const { graph, colors, spacing, red, gap } = setup()
  graph.addMode(spacing.id, 'roomy', 'Roomy')
  gap.valuesByMode.roomy = 24
  red.valuesByMode.dark = { r: 0, g: 0, b: 1, a: 1 }
  graph.setActiveMode(colors.id, 'dark')
  // A caller that mixes the collections up. `roomy` is Spacing's mode, so it says nothing about
  // Colors: the reader keeps Colors' active mode instead of silently reading its default mode.
  const reader = createVariableResolver(graph).forMode(colors.id, 'roomy')
  expect(reader.color(red.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  expect(reader.resolve(red.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })

  // Spacing owns that mode id, but the reader named Colors, so Spacing stays on its active mode.
  expect(reader.number(gap.id)).toBe(8)
})

test('an explicit mode applies to its own collection, and an alias keeps the target collection active', () => {
  const { graph, colors, spacing, red } = setup()
  red.valuesByMode.dark = { r: 0, g: 0, b: 1, a: 1 }
  graph.addMode(spacing.id, 'roomy', 'Roomy')
  graph.setActiveMode(spacing.id, 'roomy')
  const alias = graph.createVariable('Alias', 'COLOR', spacing.id, { aliasId: red.id })
  alias.valuesByMode.roomy = { aliasId: red.id }

  // The alias starts in Spacing, so Colors is read in its own active mode, not in Spacing's.
  expect(createVariableResolver(graph).forMode(spacing.id, 'roomy').color(alias.id)).toEqual({
    r: 1,
    g: 0,
    b: 0,
    a: 1
  })
  // Naming Colors' mode reaches the alias through the same collection-keyed lookup.
  expect(createVariableResolver(graph).forMode(colors.id, 'dark').color(alias.id)).toEqual({
    r: 0,
    g: 0,
    b: 1,
    a: 1
  })
})

test('the resolver answers what the old exports answer', () => {
  const { graph, colors, spacing, red, gap, label, shown } = setup()
  red.valuesByMode.dark = { r: 0, g: 0, b: 1, a: 1 }
  gap.valuesByMode.dark = 12
  const derived = graph.createVariable('Derived', 'FLOAT', spacing.id, 0)
  derived.valuesByMode[spacing.defaultModeId] = parseVariableFormula(
    graph,
    derived.id,
    spacing.defaultModeId,
    '{Gap} / 2'
  ).value
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    variableModes: { [colors.id]: 'dark' }
  })
  const child = graph.createNode('RECTANGLE', frame.id)
  const resolver = createVariableResolver(graph)
  const readerModeFor = (collectionId: string) => getActiveModeId(graph, collectionId)

  // Values: every literal type, a formula, and a per-node mode, active and default fallbacks.
  for (const id of [red.id, gap.id, label.id, shown.id, derived.id]) {
    expect(resolver.active().value(id)).toEqual(resolveVariable(graph, id))
    expect(resolver.forNode(child.id).value(id)).toEqual(resolveVariableForNode(graph, child.id, id))
    expect(resolver.forNode(child.id, 'default').value(id)).toEqual(
      resolveVariableForNode(graph, child.id, id, 'default')
    )
  }
  expect(resolver.active().number(derived.id)).toBe(resolveNumberVariable(graph, derived.id))

  // Modes and dependencies.
  expect(resolver.activeMode(colors.id)).toBe(getActiveModeId(graph, colors.id))
  expect(resolver.modeFor(child.id, colors.id)).toBe(
    getNodeVariableModeId(graph, child.id, colors.id)
  )
  expect(resolver.modeFor(child.id, spacing.id, 'default')).toBe(
    getNodeVariableModeId(graph, child.id, spacing.id, 'default')
  )
  expect(resolver.explicitModeFor(child.id, colors.id)).toBe(
    getNodeExplicitVariableModeId(graph, child.id, colors.id)
  )
  expect(resolver.modesFor(child.id)).toEqual(resolvedVariableModes(graph, child.id))
  expect(resolver.dependencies([derived.id])).toEqual(collectionsResolving(graph, [derived.id]))

  // Strict failures: the same code and message as the walker the resolver replaced.
  const cycleA = graph.createVariable('CycleA', 'FLOAT', spacing.id, 0)
  const cycleB = graph.createVariable('CycleB', 'FLOAT', spacing.id, 0)
  cycleA.valuesByMode[spacing.defaultModeId] = { aliasId: cycleB.id }
  cycleB.valuesByMode[spacing.defaultModeId] = { aliasId: cycleA.id }
  const failure = (run: () => unknown) => {
    try {
      run()
      return null
    } catch (error) {
      const resolution = error as VariableResolutionError
      return { code: resolution.code, message: resolution.message }
    }
  }
  expect(
    failure(() => createVariableResolver(graph).active().resolve(cycleA.id))
  ).toEqual(failure(() => resolveVariableInModes(graph, cycleA.id, readerModeFor)))
  expect(failure(() => createVariableResolver(graph).active().resolve('missing'))).toEqual(
    failure(() => resolveVariableInModes(graph, 'missing', readerModeFor))
  )
})
