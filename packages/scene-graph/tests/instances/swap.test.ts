import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'

/** A set with two variants and an instance of the first, named after the set. */
function setWithInstance() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { name: 'Switch' })
  const off = graph.createNode('COMPONENT', set.id, { name: 'State=Off' })
  const on = graph.createNode('COMPONENT', set.id, { name: 'State=On' })
  const instance = graph.createInstance(off.id, pageId)
  if (!instance) throw new Error('No instance')
  return { graph, instance, on }
}

describe('swapping an instance', () => {
  test('keeps the component set name when swapping between its variants', () => {
    const { graph, instance, on } = setWithInstance()
    graph.swapInstanceComponent(instance.id, on.id)
    expect(graph.getNode(instance.id)?.name).toBe('Switch')
  })

  test('renames an instance of a lone component after the one it shows', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const off = graph.createNode('COMPONENT', pageId, { name: 'Off' })
    const on = graph.createNode('COMPONENT', pageId, { name: 'On' })
    const instance = graph.createInstance(off.id, pageId)
    if (!instance) throw new Error('No instance')
    graph.swapInstanceComponent(instance.id, on.id)
    expect(graph.getNode(instance.id)?.name).toBe('On')
  })

  test('keeps the name when asked, so a view showing another variant keeps layer paths', () => {
    const { graph, instance, on } = setWithInstance()
    graph.updateNode(instance.id, { name: 'State=Off' })
    graph.swapInstanceComponent(instance.id, on.id, { keepName: true })
    expect(graph.getNode(instance.id)?.name).toBe('State=Off')
    expect(graph.getNode(instance.id)?.componentId).toBe(on.id)
  })

  test('forgets the overrides recorded for the layers it replaces', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const off = graph.createNode('COMPONENT', pageId, { name: 'Off' })
    graph.createNode('RECTANGLE', off.id, { name: 'Knob' })
    const on = graph.createNode('COMPONENT', pageId, { name: 'On' })
    graph.createNode('RECTANGLE', on.id, { name: 'Knob' })
    const instance = graph.createInstance(off.id, pageId)
    if (!instance) throw new Error('No instance')
    const [knobId] = instance.childIds
    recordInstanceOverride(graph, knobId, ['opacity'])
    expect(instance.instanceOverrides.descendants.has(knobId)).toBe(true)
    graph.swapInstanceComponent(instance.id, on.id)
    expect(graph.getNode(instance.id)?.instanceOverrides.descendants.has(knobId)).toBe(false)
  })
})
