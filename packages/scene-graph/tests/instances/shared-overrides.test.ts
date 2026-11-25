import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  EMPTY_INSTANCE_OVERRIDES,
  ownInstanceOverrides,
  setInstanceOverride
} from '@pairdraw/scene-graph/instances/overrides'

describe('the shared empty override state', () => {
  test('is what a new layer holds, so empty states cost no memory per layer', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const first = graph.createNode('RECTANGLE', page.id)
    const second = graph.createNode('RECTANGLE', page.id)

    expect(first.instanceOverrides).toBe(EMPTY_INSTANCE_OVERRIDES)
    expect(second.instanceOverrides).toBe(EMPTY_INSTANCE_OVERRIDES)
  })

  test('is shared by a layer created with an empty state of its own', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const node = graph.createNode('RECTANGLE', page.id, {
      instanceOverrides: { self: new Map(), descendants: new Map() }
    })

    expect(node.instanceOverrides).toBe(EMPTY_INSTANCE_OVERRIDES)
  })

  test('refuses every write, so a writer that skipped the owning accessor fails', () => {
    expect(() => EMPTY_INSTANCE_OVERRIDES.self.set('width', 1)).toThrow('ownInstanceOverrides')
    expect(() => EMPTY_INSTANCE_OVERRIDES.self.delete('width')).toThrow('ownInstanceOverrides')
    expect(() => EMPTY_INSTANCE_OVERRIDES.self.clear()).toThrow('ownInstanceOverrides')
    expect(() =>
      EMPTY_INSTANCE_OVERRIDES.descendants.set('child', new Map([['width', 1]]))
    ).toThrow('ownInstanceOverrides')
    expect(() => EMPTY_INSTANCE_OVERRIDES.descendants.delete('child')).toThrow(
      'ownInstanceOverrides'
    )
    expect(() => EMPTY_INSTANCE_OVERRIDES.descendants.clear()).toThrow('ownInstanceOverrides')
  })

  test('stays empty while an owning write records its override', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const edited = graph.createNode('RECTANGLE', page.id)
    const untouched = graph.createNode('RECTANGLE', page.id)

    setInstanceOverride(ownInstanceOverrides(edited), edited.id, edited.id, 'width', 120)
    graph.updateNode(edited.id, { instanceOverrides: edited.instanceOverrides })

    expect(edited.instanceOverrides.self.get('width')).toBe(120)
    expect(untouched.instanceOverrides).toBe(EMPTY_INSTANCE_OVERRIDES)
    expect(EMPTY_INSTANCE_OVERRIDES.self.size).toBe(0)
    expect(EMPTY_INSTANCE_OVERRIDES.descendants.size).toBe(0)
  })

  test('keeps an owned state owned on later writes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const node = graph.createNode('RECTANGLE', page.id)
    const owned = ownInstanceOverrides(node)

    expect(ownInstanceOverrides(node)).toBe(owned)
    expect(owned).not.toBe(EMPTY_INSTANCE_OVERRIDES)
    expect(node.instanceOverrides).toBe(owned)
  })

  test('gives an empty owned state back to the shared one', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const node = graph.createNode('RECTANGLE', page.id)
    ownInstanceOverrides(node)

    graph.updateNode(node.id, {
      instanceOverrides: { self: new Map(), descendants: new Map() }
    })

    expect(node.instanceOverrides).toBe(EMPTY_INSTANCE_OVERRIDES)
  })
})
