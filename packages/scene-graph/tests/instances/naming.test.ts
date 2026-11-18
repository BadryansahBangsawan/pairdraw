import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

/** A set with two variants and an instance of the first, named as Figma names it. */
function setWithInstance() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { name: 'Rectangle 1' })
  const first = graph.createNode('COMPONENT', set.id, { name: 'Property 1=Default' })
  const second = graph.createNode('COMPONENT', set.id, { name: 'Property 1=Variant2' })
  const instance = graph.createInstance(first.id, pageId)
  if (!instance) throw new Error('No instance')
  return { graph, set, instance, first, second }
}

describe('naming an instance', () => {
  test('names an instance of a variant after its component set, as Figma does', () => {
    const { graph, instance } = setWithInstance()
    expect(graph.getNode(instance.id)?.name).toBe('Rectangle 1')
  })

  test('names an instance of a lone component after that component', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const component = graph.createNode('COMPONENT', pageId, { name: 'Button' })
    const instance = graph.createInstance(component.id, pageId)
    if (!instance) throw new Error('No instance')
    expect(graph.getNode(instance.id)?.name).toBe('Button')
  })

  test('keeps a name the person gave the instance', () => {
    const { graph, instance, second } = setWithInstance()
    graph.updateNode(instance.id, { name: 'Power' })
    graph.swapInstanceComponent(instance.id, second.id)
    expect(graph.getNode(instance.id)?.name).toBe('Power')
  })
})
