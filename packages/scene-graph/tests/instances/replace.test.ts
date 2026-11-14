import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  canReplaceInstanceLayer,
  isReplacedLayer,
  replaceInstanceLayer,
  replacedComponentLayerId,
  restoreReplacedLayer
} from '@pairdraw/scene-graph/instances'
import {
  deserializeInstanceOverrideState,
  serializeInstanceOverrideState
} from '@pairdraw/scene-graph/instances/overrides'

/** A button component with an icon and a label, and an instance of it on the page. */
function buttonWithInstance() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const button = graph.createNode('COMPONENT', pageId, { name: 'Button', width: 120, height: 40 })
  const icon = graph.createNode('RECTANGLE', button.id, {
    name: 'Icon',
    x: 8,
    y: 8,
    width: 24,
    height: 24
  })
  const label = graph.createNode('TEXT', button.id, { name: 'Label', x: 40, y: 10, text: 'OK' })
  const instance = graph.createInstance(button.id, pageId, { x: 300 })
  if (!instance) throw new Error('No instance')
  const [iconCopy, labelCopy] = graph.getChildren(instance.id)
  return { graph, pageId, button, icon, label, instance, iconCopy, labelCopy }
}

function replaceIcon(graph: SceneGraph, pageId: string, iconCopyId: string) {
  const star = graph.createNode('STAR', pageId, { name: 'Star', x: 900, y: 900, width: 20 })
  expect(replaceInstanceLayer(graph, iconCopyId, star.id)).toBe(true)
  return star
}

describe('replacing a layer inside an instance', () => {
  test('puts the replacement in the layer’s place and removes the layer', () => {
    const { graph, pageId, instance, iconCopy, labelCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, iconCopy.id)
    expect(graph.getNode(iconCopy.id)).toBeUndefined()
    expect(graph.getNode(instance.id)?.childIds).toEqual([star.id, labelCopy.id])
    expect(graph.getNode(star.id)).toMatchObject({ x: 8, y: 8, parentId: instance.id })
  })

  test('records which component layer the replacement stands in for', () => {
    const { graph, pageId, icon, iconCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, iconCopy.id)
    const placed = graph.getNode(star.id)
    if (!placed) throw new Error('No replacement')
    expect(isReplacedLayer(graph, placed)).toBe(true)
    expect(replacedComponentLayerId(graph, placed)).toBe(icon.id)
  })

  test('keeps the replacement through a sync, while other layers follow the component', () => {
    const { graph, pageId, button, icon, label, instance, labelCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, graph.getChildren(instance.id)[0].id)
    graph.updateNode(icon.id, { width: 32, fills: [] })
    graph.updateNode(label.id, { text: 'Save' })
    graph.syncInstances(button.id)
    expect(graph.getNode(instance.id)?.childIds).toEqual([star.id, labelCopy.id])
    expect(graph.getNode(star.id)).toMatchObject({ type: 'STAR', width: 20 })
    expect(graph.getNode(labelCopy.id)?.text).toBe('Save')
  })

  test('keeps the replacement’s place when the component reorders its layers', () => {
    const { graph, pageId, button, label, instance, labelCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, graph.getChildren(instance.id)[0].id)
    graph.insertChildAt(label.id, button.id, 0)
    graph.syncInstances(button.id)
    expect(graph.getNode(instance.id)?.childIds).toEqual([labelCopy.id, star.id])
  })

  test('drops the replacement with the layer when the component deletes it', () => {
    const { graph, pageId, button, icon, instance, labelCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, graph.getChildren(instance.id)[0].id)
    graph.deleteNode(icon.id)
    graph.syncInstances(button.id)
    expect(graph.getNode(star.id)).toBeUndefined()
    expect(graph.getNode(instance.id)?.childIds).toEqual([labelCopy.id])
  })

  test('brings the replacement back when the component layer comes back, as on undo', () => {
    const { graph, pageId, button, icon, instance } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, graph.getChildren(instance.id)[0].id)
    const { id, type, parentId: _parentId, childIds: _childIds, ...props } = structuredClone(icon)
    graph.deleteNode(icon.id)
    graph.syncInstances(button.id)
    graph.createNodeWithId(id, type, button.id, props)
    graph.insertChildAt(id, button.id, 0)
    graph.syncInstances(button.id)
    expect(graph.getNode(star.id)?.parentId).toBe(instance.id)
    expect(graph.getChildren(instance.id).map((node) => node.type)).toEqual(['STAR', 'TEXT'])
  })

  test('takes no component layer links from the replacement’s own layers', () => {
    const { graph, pageId, label, iconCopy } = buttonWithInstance()
    const frame = graph.createNode('FRAME', pageId, { name: 'Pasted' })
    const inner = graph.createNode('TEXT', frame.id, { componentId: label.id })
    expect(replaceInstanceLayer(graph, iconCopy.id, frame.id)).toBe(true)
    expect(graph.getNode(inner.id)?.componentId).toBeNull()
  })

  test('can replace a replaced layer again, still in place of the same component layer', () => {
    const { graph, pageId, icon, instance, iconCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, iconCopy.id)
    const ellipse = graph.createNode('ELLIPSE', pageId, { name: 'Dot' })
    expect(replaceInstanceLayer(graph, star.id, ellipse.id)).toBe(true)
    expect(graph.getNode(star.id)).toBeUndefined()
    const placed = graph.getNode(ellipse.id)
    if (!placed) throw new Error('No replacement')
    expect(replacedComponentLayerId(graph, placed)).toBe(icon.id)
    expect(instance.instanceOverrides.descendants.has(star.id)).toBe(false)
  })

  test('is offered only for layers an instance copies from its component', () => {
    const { graph, pageId, button, icon, instance, iconCopy } = buttonWithInstance()
    expect(canReplaceInstanceLayer(graph, iconCopy.id)).toBe(true)
    expect(canReplaceInstanceLayer(graph, instance.id)).toBe(false)
    expect(canReplaceInstanceLayer(graph, icon.id)).toBe(false)
    const loose = graph.createNode('RECTANGLE', pageId)
    expect(canReplaceInstanceLayer(graph, loose.id)).toBe(false)
    expect(replaceInstanceLayer(graph, icon.id, loose.id)).toBe(false)
    expect(graph.getNode(button.id)?.childIds).toContain(icon.id)
  })

  test('refuses a replacement that would put a component inside itself', () => {
    const { graph, button, iconCopy } = buttonWithInstance()
    const self = graph.createInstance(button.id, graph.getPages()[0].id)
    if (!self) throw new Error('No instance')
    expect(replaceInstanceLayer(graph, iconCopy.id, self.id)).toBe(false)
    expect(graph.getNode(iconCopy.id)).toBeDefined()
  })

  test('restoring brings the component layer back in its place', () => {
    const { graph, pageId, icon, instance, labelCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, graph.getChildren(instance.id)[0].id)
    expect(restoreReplacedLayer(graph, star.id)).toBe(true)
    expect(graph.getNode(star.id)).toBeUndefined()
    const [restored, second] = graph.getChildren(instance.id)
    expect(restored).toMatchObject({ type: 'RECTANGLE', name: 'Icon', componentId: icon.id })
    expect(second.id).toBe(labelCopy.id)
    expect(instance.instanceOverrides.descendants.size).toBe(0)
  })

  test('stays in place, and the only layer there, in a clone of the instance', () => {
    const { graph, pageId, button, instance, iconCopy } = buttonWithInstance()
    replaceIcon(graph, pageId, iconCopy.id)
    const clone = graph.cloneTree(instance.id, pageId)
    if (!clone) throw new Error('No clone')

    graph.syncInstances(button.id)
    const children = graph.getChildren(clone.id)
    expect(children.map((node) => node.type)).toEqual(['STAR', 'TEXT'])
    expect(isReplacedLayer(graph, children[0])).toBe(true)
  })

  test('survives serializing the instance’s overrides, as the clipboard does', () => {
    const { graph, pageId, icon, instance, iconCopy } = buttonWithInstance()
    const star = replaceIcon(graph, pageId, iconCopy.id)
    const state = deserializeInstanceOverrideState(
      structuredClone(serializeInstanceOverrideState(instance.instanceOverrides))
    )
    expect(state.descendants.get(star.id)?.get('replacedLayer')).toBe(icon.id)
  })
})

describe('replacing a layer inside a nested instance', () => {
  /** A card component holding a button instance, and an instance of the card. */
  function cardWithButton() {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const button = graph.createNode('COMPONENT', pageId, { name: 'Button' })
    graph.createNode('RECTANGLE', button.id, { name: 'Icon', width: 24, height: 24 })
    graph.createNode('TEXT', button.id, { name: 'Label', text: 'OK' })
    const card = graph.createNode('COMPONENT', pageId, { name: 'Card' })
    const nested = graph.createInstance(button.id, card.id)
    const outer = graph.createInstance(card.id, pageId)
    if (!nested || !outer) throw new Error('No instance')
    const nestedCopy = graph.getChildren(outer.id)[0]
    return { graph, pageId, button, card, outer, nestedCopy }
  }

  test('keeps the replacement when either component syncs', () => {
    const { graph, pageId, button, card, nestedCopy } = cardWithButton()
    const iconCopy = graph.getChildren(nestedCopy.id)[0]
    const star = replaceIcon(graph, pageId, iconCopy.id)
    graph.syncInstances(card.id)
    expect(graph.getNode(star.id)?.parentId).toBe(nestedCopy.id)
    graph.syncInstances(button.id)
    expect(graph.getNode(star.id)?.parentId).toBe(nestedCopy.id)
    expect(graph.getChildren(nestedCopy.id).map((node) => node.type)).toEqual(['STAR', 'TEXT'])
  })

  test('restoring brings the nested layer back', () => {
    const { graph, pageId, nestedCopy } = cardWithButton()
    const star = replaceIcon(graph, pageId, graph.getChildren(nestedCopy.id)[0].id)
    expect(restoreReplacedLayer(graph, star.id)).toBe(true)
    expect(graph.getChildren(nestedCopy.id).map((node) => node.name)).toEqual(['Icon', 'Label'])
  })
})

describe('a replaced layer when the component moves the layer it replaced', () => {
  test('moves along into the layer’s new parent and stays the instance’s own', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const button = graph.createNode('COMPONENT', pageId, { name: 'Button', width: 120 })
    const icon = graph.createNode('RECTANGLE', button.id, { name: 'Icon', width: 24 })
    const wrap = graph.createNode('FRAME', button.id, { name: 'Wrap', width: 60 })
    const instance = graph.createInstance(button.id, pageId, { x: 300 })
    if (!instance) throw new Error('No instance')
    const star = graph.createNode('STAR', pageId, { name: 'Star', width: 20 })
    expect(replaceInstanceLayer(graph, graph.getChildren(instance.id)[0].id, star.id)).toBe(true)

    graph.reparentNode(icon.id, wrap.id)
    graph.syncInstances(button.id)

    const wrapCopy = graph.getChildren(instance.id).find((node) => node.name === 'Wrap')
    expect(graph.getNode(star.id)).toMatchObject({
      type: 'STAR',
      width: 20,
      parentId: wrapCopy?.id
    })
  })
})
