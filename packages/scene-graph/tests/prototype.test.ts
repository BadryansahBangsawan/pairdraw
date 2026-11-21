import { describe, expect, test } from 'bun:test'

import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'

import { expectDefined, getNodeOrThrow } from './helpers/assert'

function firstPageId(graph: SceneGraph): string {
  return graph.getPages()[0].id
}

function reaction(nodeId: string): PrototypeReaction {
  return {
    id: '2:7',
    trigger: { type: 'AFTER_TIMEOUT', delay: 1.5 },
    actions: [
      {
        type: 'NODE',
        nodeId,
        navigation: 'OVERLAY',
        transition: { type: 'DISSOLVE', duration: 0.3 },
        overlayPosition: 'BOTTOM_CENTER'
      }
    ]
  }
}

describe('prototype reactions', () => {
  test('new layers carry no reactions', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', firstPageId(graph))
    expect(node.prototypeReactions).toEqual([])
  })

  test('an edit records prototypeReactions as an edited field, so the raw .fig payload goes stale', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', firstPageId(graph))

    graph.updateNode(node.id, { prototypeReactions: [reaction(node.id)] })

    expect(node.source.editedFields).toEqual(['prototypeReactions'])
  })

  test('cloneNodeProps copies reactions by value, so each layer owns its connections', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', firstPageId(graph), {
      prototypeReactions: [reaction('2:8')]
    })
    const clone = expectDefined(graph.cloneTree(node.id, firstPageId(graph)), 'clone')

    const original = getNodeOrThrow(graph, node.id)
    const clonedNode = getNodeOrThrow(graph, clone.id)

    expect(clonedNode.prototypeReactions).toEqual(original.prototypeReactions)
    expect(clonedNode.prototypeReactions).not.toBe(original.prototypeReactions)
    expect(clonedNode.prototypeReactions[0]).not.toBe(original.prototypeReactions[0])
    expect(clonedNode.prototypeReactions[0]?.actions).not.toBe(
      original.prototypeReactions[0]?.actions
    )
  })

  test('editing a clone reaction leaves the original alone', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', firstPageId(graph), {
      prototypeReactions: [reaction('2:8')]
    })
    const clone = expectDefined(graph.cloneTree(node.id, firstPageId(graph)), 'clone')

    graph.updateNode(clone.id, { prototypeReactions: [reaction(clone.id)] })

    expect(getNodeOrThrow(graph, node.id).prototypeReactions[0]?.actions).toEqual(
      reaction('2:8').actions
    )
    expect(getNodeOrThrow(graph, clone.id).prototypeReactions[0]?.actions).toEqual(
      reaction(clone.id).actions
    )
  })
})

describe('overflow scrolling', () => {
  test('a new frame does not scroll', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', firstPageId(graph))
    expect(node.overflowDirection).toBe('NONE')
  })

  test("an instance scrolls the way its main component does, and follows the main's changes", () => {
    const graph = new SceneGraph()
    const component = graph.createNode('COMPONENT', firstPageId(graph), {
      overflowDirection: 'VERTICAL'
    })
    const instance = expectDefined(graph.createInstance(component.id, firstPageId(graph)))
    expect(instance.overflowDirection).toBe('VERTICAL')

    graph.updateNode(component.id, { overflowDirection: 'BOTH' })
    graph.syncInstances(component.id)
    expect(getNodeOrThrow(graph, instance.id).overflowDirection).toBe('BOTH')
  })
})

describe('scroll behavior', () => {
  test('a new layer scrolls with its parent', () => {
    const graph = new SceneGraph()
    expect(graph.createNode('FRAME', firstPageId(graph)).scrollBehavior).toBe('SCROLLS')
  })

  test("an instance follows its main component's scroll behavior", () => {
    const graph = new SceneGraph()
    const component = graph.createNode('COMPONENT', firstPageId(graph), {
      scrollBehavior: 'FIXED'
    })
    const instance = expectDefined(graph.createInstance(component.id, firstPageId(graph)))
    expect(instance.scrollBehavior).toBe('FIXED')

    graph.updateNode(component.id, { scrollBehavior: 'SCROLLS' })
    graph.syncInstances(component.id)
    expect(getNodeOrThrow(graph, instance.id).scrollBehavior).toBe('SCROLLS')
  })
})
