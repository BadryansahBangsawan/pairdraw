import { describe, expect, test } from 'bun:test'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import { readComments, writeComments } from '@pairdraw/scene-graph/comments'
import { PAIRDRAW_PLUGIN_DATA, readPluginData } from '@pairdraw/scene-graph/plugin-data'
import {
  discardVariations,
  applyVariation,
  copyVersion,
  VariationError,
  variationPickProblem,
  variationSetOf,
  withVariationSet
} from '@pairdraw/scene-graph/variations'

import { expectDefined, getNodeOrThrow } from '../helpers/assert'

function markSet(graph: SceneGraph, section: SceneNode, originalId: string) {
  graph.updateNode(section.id, {
    pluginData: withVariationSet(section, { version: 1, originalId })
  })
}

/** A list in auto layout holding a card, and a set with two copies of the card. */
function setUp() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const list = graph.createNode('FRAME', pageId, { name: 'List', layoutMode: 'VERTICAL' })
  const before = graph.createNode('FRAME', list.id, { name: 'Before' })
  const card = graph.createNode('FRAME', list.id, {
    name: 'Card',
    x: 0,
    y: 120,
    width: 300,
    height: 100,
    layoutGrow: 1,
    layoutAlignSelf: 'STRETCH'
  })
  const title = graph.createNode('TEXT', card.id, { name: 'Title', text: 'Hello' })
  const badge = graph.createNode('RECTANGLE', card.id, { name: 'Badge' })
  graph.createNode('FRAME', list.id, { name: 'After' })
  const section = graph.createNode('SECTION', pageId, { name: 'Variations · Card', x: 800 })
  markSet(graph, section, card.id)
  const v1 = expectDefined(graph.cloneTree(card.id, section.id, { name: 'V1', x: 80, y: 80 }))
  const v2 = expectDefined(graph.cloneTree(card.id, section.id, { name: 'V2', x: 480, y: 80 }))
  return { graph, pageId, list, before, card, title, badge, section, v1, v2 }
}

function child(graph: SceneGraph, parent: SceneNode, name: string): SceneNode {
  return expectDefined(
    graph.getChildren(parent.id).find((node) => node.name === name),
    `child ${name}`
  )
}

describe('applyVariation', () => {
  test('the original takes the version look and keeps its id, name, place and layout', () => {
    const { graph, list, before, card, title, section, v2 } = setUp()
    graph.updateNode(v2.id, { width: 360, height: 140, fills: [], cornerRadius: 12 })
    graph.updateNode(child(graph, v2, 'Title').id, { text: 'Calmer', fontSize: 20 })

    expect(applyVariation(graph, v2.id)).toEqual({ originalId: card.id })

    const kept = getNodeOrThrow(graph, card.id)
    expect(kept).toMatchObject({
      name: 'Card',
      x: 0,
      y: 120,
      width: 360,
      height: 140,
      cornerRadius: 12,
      layoutGrow: 1,
      layoutAlignSelf: 'STRETCH'
    })
    expect(kept.fills).toEqual([])
    expect(list.childIds.indexOf(card.id)).toBe(list.childIds.indexOf(before.id) + 1)
    expect(getNodeOrThrow(graph, title.id)).toMatchObject({ text: 'Calmer', fontSize: 20 })
    expect(graph.getNode(section.id)).toBeUndefined()
    expect(graph.getNode(v2.id)).toBeUndefined()
  })

  test('layers only the version has move in, in its order; layers only the original had go', () => {
    const { graph, card, title, badge, v1 } = setUp()
    graph.deleteNode(child(graph, v1, 'Badge').id)
    const icon = graph.createNode('VECTOR', v1.id, { name: 'Icon' })
    graph.insertChildAt(icon.id, v1.id, 0)

    applyVariation(graph, v1.id)

    expect(getNodeOrThrow(graph, card.id).childIds).toEqual([icon.id, title.id])
    expect(graph.getNode(badge.id)).toBeUndefined()
    expect(getNodeOrThrow(graph, icon.id).parentId).toBe(card.id)
  })

  test('a main component stays one and keeps its properties', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const button = graph.createNode('COMPONENT', pageId, {
      name: 'Button',
      componentKey: 'key-1',
      componentPropertyDefinitions: [
        { id: 'Label#1:0', name: 'Label', type: 'TEXT', defaultValue: 'Go' }
      ]
    })
    graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go' })
    const section = graph.createNode('SECTION', pageId, { name: 'Variations · Button' })
    markSet(graph, section, button.id)
    const version = expectDefined(graph.cloneTree(button.id, section.id, { name: 'V1' }))
    graph.updateNode(version.id, {
      type: 'FRAME',
      componentKey: null,
      componentPropertyDefinitions: [],
      cornerRadius: 999
    })

    applyVariation(graph, version.id)

    expect(getNodeOrThrow(graph, button.id)).toMatchObject({
      type: 'COMPONENT',
      componentKey: 'key-1',
      cornerRadius: 999
    })
    expect(getNodeOrThrow(graph, button.id).componentPropertyDefinitions).toHaveLength(1)
  })

  test('prototype links move to the original; comment pins stay where they were', () => {
    const { graph, pageId, card, title, v1 } = setUp()
    const vTitle = child(graph, v1, 'Title')
    graph.updateNode(vTitle.id, {
      prototypeReactions: [
        {
          id: 'r1',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: v1.id,
              navigation: 'NAVIGATE',
              transition: { type: 'INSTANT', duration: 0 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    writeComments(graph, [
      {
        id: 't1',
        pageId,
        nodeId: v1.id,
        x: 0,
        y: 0,
        author: 'Ana',
        text: 'Love this one',
        createdAt: '',
        updatedAt: '',
        resolved: false,
        replies: []
      }
    ])

    applyVariation(graph, v1.id)

    const [action] = getNodeOrThrow(graph, title.id).prototypeReactions[0].actions
    expect(action).toMatchObject({ type: 'NODE', nodeId: card.id })
    // Comments stay out of undo, so the pick leaves them: a pin on a removed version falls back
    // to its stored point, as on any deleted layer.
    expect(readComments(graph)[0].nodeId).toBe(v1.id)
  })

  test('a layer outside any set, the section itself, and a set whose original is gone are refused', () => {
    const { graph, card, section, v1 } = setUp()
    expect(() => applyVariation(graph, card.id)).toThrow(VariationError)
    expect(() => applyVariation(graph, section.id)).toThrow('is not a version')
    graph.deleteNode(card.id)
    const view = expectDefined(variationSetOf(graph, v1.id))
    expect(variationPickProblem(graph, view, v1.id)).toBe('original-missing')
    expect(() => applyVariation(graph, v1.id)).toThrow('is gone')
  })
})

describe('what a pick refuses and what it sends', () => {
  test('a version of another type than the original is refused, and nothing changes', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const button = graph.createNode('COMPONENT', pageId, { name: 'Button', x: 2000 })
    graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go' })
    const instance = expectDefined(graph.createInstance(button.id, pageId))
    const section = graph.createNode('SECTION', pageId, { name: 'Variations · Button' })
    markSet(graph, section, instance.id)
    // As `render` with `replace_id` leaves it: a frame where the instance's copy was.
    const frame = graph.createNode('FRAME', section.id, { name: 'V1 · Pill', cornerRadius: 20 })
    const view = expectDefined(variationSetOf(graph, frame.id))

    expect(variationPickProblem(graph, view, frame.id)).toBe('version-type-differs')
    expect(() => applyVariation(graph, frame.id)).toThrow('different kind of layer')
    expect(getNodeOrThrow(graph, instance.id)).toMatchObject({
      type: 'INSTANCE',
      componentId: button.id
    })
    expect(graph.getInstances(button.id)).toHaveLength(1)
  })

  test('a locked original is refused', () => {
    const { graph, card, v1 } = setUp()
    graph.updateNode(card.id, { locked: true })
    expect(() => applyVariation(graph, v1.id)).toThrow('locked')
  })

  test('only changed layers are updated and only moved layers are reordered', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const card = graph.createNode('FRAME', pageId, { name: 'Card' })
    for (let index = 0; index < 50; index++) {
      graph.createNode('RECTANGLE', card.id, { name: `R${index}` })
    }
    const section = graph.createNode('SECTION', pageId, { name: 'Variations · Card' })
    markSet(graph, section, card.id)
    const version = expectDefined(graph.cloneTree(card.id, section.id, { name: 'V1' }))
    const changed = graph.getChildren(version.id)[7]
    graph.updateNode(changed.id, { cornerRadius: 8 })

    const updated: string[] = []
    let reordered = 0
    graph.onNodeEvents({
      updated: (id) => updated.push(id),
      reordered: () => reordered++
    })
    applyVariation(graph, version.id)

    expect(reordered).toBe(0)
    expect(updated).toEqual([card.childIds[7]])
    expect(getNodeOrThrow(graph, card.childIds[7]).cornerRadius).toBe(8)
  })
})

describe('main components inside the original', () => {
  /** A frame holding a main component and an instance of it, with another instance outside. */
  function kit() {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, { name: 'Kit' })
    const button = graph.createNode('COMPONENT', frame.id, { name: 'Button', width: 80 })
    graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go' })
    const inside = expectDefined(graph.createInstance(button.id, frame.id, { name: 'Use' }))
    const outside = expectDefined(graph.createInstance(button.id, pageId, { x: 900 }))
    const section = graph.createNode('SECTION', pageId, { name: 'Variations · Kit', x: 2000 })
    markSet(graph, section, frame.id)
    const version = expectDefined(copyVersion(graph, frame.id, section.id, { name: 'V1' }))
    return { graph, frame, button, inside, outside, version }
  }

  test('a main component the version shows as an instance of itself is kept as it is', () => {
    const { graph, frame, button, inside, outside, version } = kit()
    graph.updateNode(version.id, { cornerRadius: 12 })

    applyVariation(graph, version.id)

    expect(getNodeOrThrow(graph, button.id)).toMatchObject({
      type: 'COMPONENT',
      parentId: frame.id,
      width: 80
    })
    expect(getNodeOrThrow(graph, frame.id).childIds).toEqual([button.id, inside.id])
    expect(getNodeOrThrow(graph, frame.id).cornerRadius).toBe(12)
    expect(getNodeOrThrow(graph, outside.id).componentId).toBe(button.id)
    expect(
      graph
        .getInstances(button.id)
        .map((node) => node.id)
        .toSorted()
    ).toEqual([inside.id, outside.id].toSorted())
  })

  test('a component set the version shows as a frame of instances is kept with its variants', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, { name: 'Kit' })
    const set = graph.createNode('COMPONENT_SET', frame.id, { name: 'Button' })
    const on = graph.createNode('COMPONENT', set.id, { name: 'State=On' })
    const off = graph.createNode('COMPONENT', set.id, { name: 'State=Off' })
    const outside = expectDefined(graph.createInstance(on.id, pageId, { x: 900 }))
    const section = graph.createNode('SECTION', pageId, { name: 'Variations · Kit', x: 2000 })
    markSet(graph, section, frame.id)
    const version = expectDefined(copyVersion(graph, frame.id, section.id, { name: 'V1' }))

    applyVariation(graph, version.id)

    expect(getNodeOrThrow(graph, set.id)).toMatchObject({ type: 'COMPONENT_SET', parentId: frame.id })
    expect(getNodeOrThrow(graph, set.id).childIds).toEqual([on.id, off.id])
    expect(getNodeOrThrow(graph, on.id).type).toBe('COMPONENT')
    expect(getNodeOrThrow(graph, outside.id).componentId).toBe(on.id)
  })

  test('a main component the version no longer shows is never deleted, and keeps its place', () => {
    const { graph, frame, button, inside, version } = kit()
    const standIn = expectDefined(graph.getChildren(version.id)[0])
    graph.deleteNode(standIn.id)

    applyVariation(graph, version.id)

    expect(getNodeOrThrow(graph, button.id).type).toBe('COMPONENT')
    expect(getNodeOrThrow(graph, frame.id).childIds).toEqual([button.id, inside.id])
  })

  test('a copy of a stand-in made inside the version is an ordinary instance, kept on pick', () => {
    const { graph, frame, button, version } = kit()
    const standIn = expectDefined(graph.getChildren(version.id)[0])
    // As Duplicate leaves it: a second instance of the component beside the stand-in.
    const copy = expectDefined(graph.cloneTree(standIn.id, version.id, { name: 'Button 2' }))
    expect(readPluginData(copy.pluginData, PAIRDRAW_PLUGIN_DATA.variationStandIn)).toBeUndefined()

    applyVariation(graph, version.id)

    expect(getNodeOrThrow(graph, button.id).type).toBe('COMPONENT')
    expect(getNodeOrThrow(graph, copy.id)).toMatchObject({
      type: 'INSTANCE',
      componentId: button.id,
      parentId: frame.id
    })
  })

  test('a version dragged out of its set is an ordinary frame when it is varied in turn', () => {
    const { graph, button, version } = kit()
    const pageId = graph.getPages()[0].id
    graph.reparentNode(version.id, pageId)
    const instance = expectDefined(graph.getChildren(version.id)[0])
    const section = graph.createNode('SECTION', pageId, { name: 'Variations · V1', x: 4000 })
    markSet(graph, section, version.id)
    const next = expectDefined(copyVersion(graph, version.id, section.id, { name: 'V1 again' }))

    applyVariation(graph, next.id)

    expect(getNodeOrThrow(graph, instance.id)).toMatchObject({
      type: 'INSTANCE',
      componentId: button.id,
      parentId: version.id
    })
    expect(getNodeOrThrow(graph, button.id).type).toBe('COMPONENT')
  })

  test('an instance named like its component, before it, is an instance, not the stand-in', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, { name: 'Kit' })
    const button = graph.createNode('COMPONENT', pageId, { name: 'Button', x: 900 })
    graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go' })
    // The instance comes first and has the component's name; the component sits after it.
    const instance = expectDefined(graph.createInstance(button.id, frame.id, { name: 'Button' }))
    graph.reparentNode(button.id, frame.id)
    const section = graph.createNode('SECTION', pageId, { name: 'Variations · Kit', x: 2000 })
    markSet(graph, section, frame.id)
    const version = expectDefined(copyVersion(graph, frame.id, section.id, { name: 'V1' }))
    const [versionInstance] = graph.getChildren(version.id)
    const versionLabel = expectDefined(graph.getChildren(versionInstance.id)[0])
    graph.updateNode(versionLabel.id, { text: 'Buy now' })

    applyVariation(graph, version.id)

    expect(getNodeOrThrow(graph, frame.id).childIds).toEqual([instance.id, button.id])
    expect(getNodeOrThrow(graph, button.id).type).toBe('COMPONENT')
    expect(getNodeOrThrow(graph, instance.id)).toMatchObject({
      type: 'INSTANCE',
      componentId: button.id
    })
    const label = expectDefined(graph.getChildren(instance.id)[0])
    expect(label.text).toBe('Buy now')
  })
})

describe('discardVariations', () => {
  test('removes the section and every version and leaves the original alone', () => {
    const { graph, card, section, v1, v2 } = setUp()
    expect(discardVariations(graph, v1.id)).toEqual({ originalId: card.id })
    for (const id of [section.id, v1.id, v2.id]) expect(graph.getNode(id)).toBeUndefined()
    expect(getNodeOrThrow(graph, card.id).name).toBe('Card')
  })
})
