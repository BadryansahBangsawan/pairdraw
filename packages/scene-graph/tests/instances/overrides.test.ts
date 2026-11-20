import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'
import {
  bindingOverrideField,
  overriddenBindingField
} from '@pairdraw/scene-graph/instances/overrides'

describe('binding override fields', () => {
  test('claim one binding of the layer, which they name', () => {
    expect(bindingOverrideField('fills/0/color')).toBe('boundVariables/fills/0/color')
    expect(overriddenBindingField(bindingOverrideField('opacity'))).toBe('opacity')
  })

  test('are not overrides of the layer’s fields, nor of all its bindings', () => {
    for (const field of ['fills', 'opacity', 'boundVariables'])
      expect(overriddenBindingField(field)).toBeNull()
  })
})

test('deleting a layer drops the overrides that named it', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id)
  graph.createNode('TEXT', component.id, { text: 'Label' })
  const instance = graph.createInstance(component.id, page.id, { x: 0, y: 0 })
  if (!instance) throw new Error('Missing instance')
  const child = graph.getChildren(instance.id)[0]
  if (!child) throw new Error('Missing child')
  recordInstanceOverride(graph, child.id, ['visible'])

  graph.deleteNode(child.id)

  // An override names a layer of the instance; one that names no layer makes the file carry a
  // claim for nothing, which reopening turns into a layer the document never had.
  expect([...instance.instanceOverrides.descendants.keys()]).not.toContain(child.id)
})
