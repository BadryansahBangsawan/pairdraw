import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  defaultVariant,
  restingVariant,
  variantDefaultValue,
  variantInstanceFor,
  variantSetsAround
} from '@pairdraw/scene-graph/components'

/** A set of sizes laid out with Large first in its children but Small in the top-left corner. */
function sizes(defaultValue: string) {
  const graph = new SceneGraph()
  const definition = {
    id: 'size',
    name: 'Size',
    type: 'VARIANT' as const,
    defaultValue,
    variantOptions: ['Small', 'Large']
  }
  const set = graph.createNode('COMPONENT_SET', graph.getPages()[0].id, {
    name: 'Button',
    componentPropertyDefinitions: [definition]
  })
  graph.createNode('COMPONENT', set.id, {
    name: 'Size=Large',
    x: 0,
    y: 60,
    componentPropertyValues: { Size: 'Large' }
  })
  graph.createNode('COMPONENT', set.id, {
    name: 'Size=Small',
    x: 0,
    y: 0,
    componentPropertyValues: { Size: 'Small' }
  })
  return { graph, set, definition }
}

describe('default variants', () => {
  test('are the variant in the top-left corner, whatever the order of the children', () => {
    const { graph, set } = sizes('')
    expect(defaultVariant(graph, set)?.name).toBe('Size=Small')
  })

  test('give a property its default value when the document leaves it out', () => {
    const empty = sizes('')
    expect(variantDefaultValue(empty.graph, empty.set, empty.definition)).toBe('Small')
    // A recorded default that is one of the options stands.
    const recorded = sizes('Large')
    expect(variantDefaultValue(recorded.graph, recorded.set, recorded.definition)).toBe('Large')
  })

  test('rest at the recorded defaults when they name a variant, else at the default variant', () => {
    const recorded = sizes('Large')
    expect(restingVariant(recorded.graph, recorded.set)?.name).toBe('Size=Large')
    const empty = sizes('')
    expect(restingVariant(empty.graph, empty.set)?.name).toBe('Size=Small')
  })
})

/** A toggle set (Off, On) with a label inside each variant, an instance of Off in a card. */
function toggle() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { name: 'Toggle' })
  const off = graph.createNode('COMPONENT', set.id, { name: 'State=Off' })
  const label = graph.createNode('TEXT', off.id, { name: 'Label' })
  const on = graph.createNode('COMPONENT', set.id, { name: 'State=On', x: 100 })
  const card = graph.createNode('FRAME', pageId, { name: 'Card' })
  const instance = graph.createInstance(off.id, card.id)
  if (!instance) throw new Error('no instance')
  return { graph, set, off, on, label, card, instance }
}

describe('variant sets a layer can change', () => {
  test('are the set of a variant, of an instance of one, and of a layer inside either', () => {
    const { graph, set, off, label, instance } = toggle()
    const ids = (nodeId: string) => variantSetsAround(graph, nodeId).map((node) => node.id)
    expect(ids(off.id)).toEqual([set.id])
    expect(ids(label.id)).toEqual([set.id])
    expect(ids(instance.id)).toEqual([set.id])
    expect(ids(graph.getChildren(instance.id)[0].id)).toEqual([set.id])
  })

  test('are none for a layer outside any variant', () => {
    const { graph, card } = toggle()
    expect(variantSetsAround(graph, card.id)).toEqual([])
  })

  test('list the nearest set first when variants nest', () => {
    const { graph, set: toggleSet, off } = toggle()
    const pageId = graph.getPages()[0].id
    const rows = graph.createNode('COMPONENT_SET', pageId, { name: 'Row' })
    const closed = graph.createNode('COMPONENT', rows.id, { name: 'Open=No' })
    const nested = graph.createInstance(off.id, closed.id)
    if (!nested) throw new Error('no instance')
    expect(variantSetsAround(graph, nested.id).map((node) => node.id)).toEqual([
      toggleSet.id,
      rows.id
    ])
  })

  test("find the instance a change to a set's variant switches", () => {
    const { graph, set, off, label, instance } = toggle()
    const inside = graph.getChildren(instance.id)[0]
    expect(variantInstanceFor(graph, inside.id, set.id)?.id).toBe(instance.id)
    expect(variantInstanceFor(graph, instance.id, set.id)?.id).toBe(instance.id)
    // The main component itself is not an instance: nothing on the canvas switches.
    expect(variantInstanceFor(graph, label.id, set.id)).toBeUndefined()
    expect(variantInstanceFor(graph, off.id, set.id)).toBeUndefined()
  })
})
