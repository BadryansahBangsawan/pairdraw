import { expect, test } from 'bun:test'

import { applyDocumentPaintBindings } from '#fig/document/bindings/paint'

import { SceneGraph, type Fill } from '@pairdraw/scene-graph'
import {
  ownInstanceOverrides,
  setInstanceOverride
} from '@pairdraw/scene-graph/instances/overrides'
import { reconcileVariableBindings } from '@pairdraw/scene-graph/variables'

const BLACK_FILL: Fill = {
  type: 'SOLID',
  color: { r: 0, g: 0, b: 0, a: 1 },
  opacity: 0.5,
  visible: true,
  blendMode: 'NORMAL'
}

function setup() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const collection = graph.createCollection('Colors')
  const accent = graph.createVariable('Accent', 'COLOR', collection.id, {
    r: 1,
    g: 1,
    b: 1,
    a: 0.2
  })
  const boundFill = { fills: [BLACK_FILL], boundVariables: { 'fills/0/color': accent.id } }
  const layer = graph.createNode('RECTANGLE', page, boundFill)
  const instance = graph.createNode('INSTANCE', page)
  const copy = graph.createNode('RECTANGLE', instance.id, boundFill)
  return { graph, layer, instance, copy }
}

// An imported layer's saved cache has nothing vouching for it: it shows its variable's color,
// alpha as opacity, as Figma shows an imported layer in its variables.
test("an imported layer's bound paint takes its variable's color", () => {
  const { graph, layer } = setup()
  applyDocumentPaintBindings(graph, [layer])
  expect(layer.fills[0].color).toEqual({ r: 1, g: 1, b: 1, a: 1 })
  expect(layer.fills[0].opacity).toBeCloseTo(0.2)
})

// Once import applied the variable's color, an edit to the paint sticks until that color changes.
test('an edited paint stays through a reconcile until its variable changes', () => {
  const { graph, layer } = setup()
  applyDocumentPaintBindings(graph, [layer])
  graph.updateNode(layer.id, { fills: [{ ...layer.fills[0], opacity: 0.5 }] })
  const accent = layer.boundVariables['fills/0/color']
  reconcileVariableBindings(graph, { variables: [accent] })
  expect(layer.fills[0].opacity).toBe(0.5)
  const variable = graph.variables.get(accent)
  if (!variable) throw new Error('accent')
  variable.valuesByMode[Object.keys(variable.valuesByMode)[0]] = { r: 0, g: 1, b: 0, a: 1 }
  reconcileVariableBindings(graph, { variables: [accent] })
  expect(layer.fills[0].color).toEqual({ r: 0, g: 1, b: 0, a: 1 })
  expect(layer.fills[0].opacity).toBe(1)
})

test("an instance's copy takes its variable's color", () => {
  const { graph, copy } = setup()
  applyDocumentPaintBindings(graph, [copy])
  expect(copy.fills[0].color).toEqual({ r: 1, g: 1, b: 1, a: 1 })
  expect(copy.fills[0].opacity).toBeCloseTo(0.2)
})

test('a copy whose fills the instance overrides shows its variable, then keeps its edits', () => {
  const { graph, instance, copy } = setup()
  setInstanceOverride(ownInstanceOverrides(instance), instance.id, copy.id, 'fills', copy.fills)
  applyDocumentPaintBindings(graph, [copy])
  expect(copy.fills[0].color).toEqual({ r: 1, g: 1, b: 1, a: 1 })
  expect(copy.fills[0].opacity).toBeCloseTo(0.2)
  // The override is the copy's own paint: an edit to it sticks as any layer's edit does.
  graph.updateNode(copy.id, { fills: [{ ...copy.fills[0], opacity: 0.5 }] })
  reconcileVariableBindings(graph, { variables: [copy.boundVariables['fills/0/color']] })
  expect(copy.fills[0].opacity).toBe(0.5)
})
