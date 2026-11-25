import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'
import {
  ownInstanceOverrides,
  overriddenVariableModeCollection,
  variableModeOverrideField
} from '@pairdraw/scene-graph/instances/overrides'

/** A component that sets a theme and a density mode, with a layer that sets a brand mode. */
function componentWithModes() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const component = graph.createNode('COMPONENT', pageId, {
    name: 'Card',
    variableModes: { theme: 'light', density: 'compact' }
  })
  const layer = graph.createNode('FRAME', component.id, {
    name: 'Badge',
    variableModes: { brand: 'blue' }
  })
  const instance = graph.createInstance(component.id, pageId)
  if (!instance) throw new Error('No instance')
  const copy = graph.getChildren(instance.id)[0]
  return { graph, pageId, component, layer, instance, copy }
}

/** Set modes on a layer as an edit does, recording the override in its instance. */
function editModes(graph: SceneGraph, id: string, variableModes: Record<string, string>) {
  graph.updateNode(id, { variableModes })
  recordInstanceOverride(graph, id, ['variableModes'])
}

describe('variable mode override fields', () => {
  test('claim one collection, which they name', () => {
    expect(variableModeOverrideField('theme')).toBe('variableModes/theme')
    expect(overriddenVariableModeCollection(variableModeOverrideField('theme'))).toBe('theme')
    expect(overriddenVariableModeCollection('variableModes')).toBeNull()
  })
})

describe('an instance’s variable modes', () => {
  test('record only the collections an edit changes', () => {
    const { graph, instance } = componentWithModes()
    editModes(graph, instance.id, { theme: 'dark', density: 'compact' })
    expect([...instance.instanceOverrides.self.keys()]).toEqual(['variableModes/theme'])
  })

  test('take a component change in a collection the instance did not override', () => {
    const { graph, component, instance } = componentWithModes()
    editModes(graph, instance.id, { theme: 'dark', density: 'compact' })
    graph.updateNode(component.id, { variableModes: { theme: 'light', density: 'comfortable' } })
    graph.syncInstances(component.id)
    expect(graph.getNode(instance.id)?.variableModes).toEqual({
      theme: 'dark',
      density: 'comfortable'
    })
  })

  test('keep a collection the instance cleared while the component sets it', () => {
    const { graph, component, instance } = componentWithModes()
    editModes(graph, instance.id, { density: 'compact' })
    graph.updateNode(component.id, { variableModes: { theme: 'dim', density: 'comfortable' } })
    graph.syncInstances(component.id)
    expect(graph.getNode(instance.id)?.variableModes).toEqual({ density: 'comfortable' })
  })

  test('take a collection the component adds', () => {
    const { graph, component, instance } = componentWithModes()
    editModes(graph, instance.id, { theme: 'dark', density: 'compact' })
    graph.updateNode(component.id, {
      variableModes: { theme: 'light', density: 'compact', brand: 'red' }
    })
    graph.syncInstances(component.id)
    expect(graph.getNode(instance.id)?.variableModes).toEqual({
      theme: 'dark',
      density: 'compact',
      brand: 'red'
    })
  })

  test('keep every mode under an override of the whole map, as files record it', () => {
    const { graph, component, instance } = componentWithModes()
    graph.updateNode(instance.id, { variableModes: { theme: 'dark' } })
    ownInstanceOverrides(instance).self.set('variableModes', true)
    graph.updateNode(component.id, { variableModes: { theme: 'light', density: 'comfortable' } })
    graph.syncInstances(component.id)
    expect(graph.getNode(instance.id)?.variableModes).toEqual({ theme: 'dark' })
  })

  test('merge collection by collection in a layer inside the instance', () => {
    const { graph, layer, instance, copy } = componentWithModes()
    editModes(graph, copy.id, { brand: 'green' })
    expect([...(instance.instanceOverrides.descendants.get(copy.id)?.keys() ?? [])]).toEqual([
      'variableModes/brand'
    ])
    graph.updateNode(layer.id, { variableModes: { brand: 'blue', theme: 'dark' } })
    graph.syncInstances(layer.parentId ?? '')
    expect(graph.getNode(copy.id)?.variableModes).toEqual({ brand: 'green', theme: 'dark' })
  })

  test('survive a swap to another component, axis by axis', () => {
    const { graph, pageId, instance } = componentWithModes()
    const other = graph.createNode('COMPONENT', pageId, {
      name: 'Other',
      variableModes: { theme: 'light', density: 'spacious' }
    })
    editModes(graph, instance.id, { theme: 'dark', density: 'compact' })
    graph.swapInstanceComponent(instance.id, other.id)
    expect(graph.getNode(instance.id)?.variableModes).toEqual({
      theme: 'dark',
      density: 'spacious'
    })
  })

  test('of a nested instance merge when the outer component syncs it', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const button = graph.createNode('COMPONENT', pageId, {
      name: 'Button',
      variableModes: { theme: 'light', density: 'compact' }
    })
    const card = graph.createNode('COMPONENT', pageId, { name: 'Card' })
    const nested = graph.createInstance(button.id, card.id)
    const outer = graph.createInstance(card.id, pageId)
    if (!nested || !outer) throw new Error('No instance')
    const copy = graph.getChildren(outer.id)[0]
    editModes(graph, copy.id, { theme: 'dark', density: 'compact' })
    graph.updateNode(nested.id, { variableModes: { theme: 'light', density: 'comfortable' } })
    graph.syncInstances(card.id)
    expect(graph.getNode(copy.id)?.variableModes).toEqual({
      theme: 'dark',
      density: 'comfortable'
    })
  })
})
