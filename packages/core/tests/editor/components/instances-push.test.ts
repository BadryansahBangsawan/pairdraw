import { beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { registerTestFont, solidFill } from '#core-tests/helpers/figma-api'

import { createEditor } from '@pairdraw/core'
import { FigmaAPI, type FigmaNodeProxy } from '@pairdraw/core/figma-api'
import { SceneGraph, type SceneGraph as Graph, type SceneNode } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'

beforeAll(() => registerTestFont())

/** A component holding a rectangle and a text layer, and an instance showing it. */
function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const component = figma.createComponent()
  component.name = 'Card'
  component.resize(120, 80)
  const box = expectDefined(figma.createRectangle(), 'rectangle')
  box.name = 'Box'
  box.fills = [solidFill({ r: 0, g: 1, b: 0, a: 1 })]
  component.appendChild(box)
  const label = expectDefined(figma.createText(), 'text')
  label.name = 'Label'
  label.characters = 'Main'
  component.appendChild(label)
  const instance = expectDefined(component.createInstance(), 'instance')
  const editor = createEditor({ graph, skipInitialGraphSetup: true })
  const [copyBox, copyLabel] = instance.children as FigmaNodeProxy[]
  return { graph, editor, component, box, label, instance, copyBox, copyLabel }
}

const fillColor = (node: FigmaNodeProxy) => {
  const fills = node.fills
  if (!Array.isArray(fills)) return undefined
  const [fill] = fills as { color?: { r: number; g: number; b: number } }[]
  return fill?.color
}

function firstText(graph: Graph, id: string): SceneNode | undefined {
  for (const child of graph.getChildren(id)) {
    if (child.type === 'TEXT') return child
    const nested = firstText(graph, child.id)
    if (nested) return nested
  }
  return undefined
}

describe('pushing an instance to its main component', () => {
  test('applies text, fill, visibility, and size overrides to the main component', () => {
    const { graph, editor, component, box, label, instance, copyBox, copyLabel } = setup()
    copyLabel.characters = 'Changed'
    copyBox.fills = [solidFill({ r: 1, g: 0, b: 0, a: 1 })]
    copyBox.visible = false
    instance.resize(140, 90)

    expect(editor.pushInstanceOverrides(instance.id)).toBe(true)

    expect(graph.getNode(label.id)?.text).toBe('Changed')
    expect(fillColor(copyBox)).toEqual({ r: 1, g: 0, b: 0 })
    expect(graph.getNode(box.id)?.visible).toBe(false)
    expect(component.width).toBe(140)
    expect(component.height).toBe(90)
    expect(editor.instanceHasOverrides(instance.id)).toBe(false)
  })

  test('makes other instances follow unless they override the same field', () => {
    const { graph, editor, component, instance, copyBox, copyLabel } = setup()
    const other = expectDefined(component.createInstance(), 'second instance')
    const [otherBox, otherLabel] = other.children as FigmaNodeProxy[]
    copyLabel.characters = 'Changed'
    copyBox.fills = [solidFill({ r: 1, g: 0, b: 0, a: 1 })]
    otherLabel.characters = 'Other'

    editor.pushInstanceOverrides(instance.id)

    expect(firstText(graph, other.id)?.text).toBe('Other')
    expect(fillColor(otherBox)).toEqual({ r: 1, g: 0, b: 0 })
    expect(fillColor(copyBox)).toEqual({ r: 1, g: 0, b: 0 })
  })

  test('restores the main component and the instance over one undo step', () => {
    const { graph, editor, component, instance, copyLabel } = setup()
    copyLabel.characters = 'Changed'

    editor.pushInstanceOverrides(instance.id)
    expect(firstText(graph, component.id)?.text).toBe('Changed')

    editor.undoAction()
    expect(firstText(graph, component.id)?.text).toBe('Main')
    expect(firstText(graph, instance.id)?.text).toBe('Changed')
    expect(editor.instanceHasOverrides(instance.id)).toBe(true)
  })

  test('pushes a nested instance override to the nested main component', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const inner = graph.createNode('COMPONENT', page.id, { name: 'Inner' })
    const innerLabel = graph.createNode('TEXT', inner.id, { name: 'Label', text: 'Inner' })
    const outer = graph.createNode('COMPONENT', page.id, { name: 'Outer' })
    expectDefined(graph.createInstance(inner.id, outer.id), 'nested instance')
    const instance = expectDefined(graph.createInstance(outer.id, page.id), 'outer instance')
    const editor = createEditor({ graph, skipInitialGraphSetup: true })
    const nested = expectDefined(firstText(graph, instance.id), 'nested text')
    graph.updateNode(nested.id, { text: 'Nested edit' })
    recordInstanceOverride(graph, nested.id, ['text'])

    expect(editor.canPushInstanceOverrides(instance.id)).toBe(true)
    expect(editor.pushInstanceOverrides(instance.id)).toBe(true)

    expect(graph.getNode(innerLabel.id)?.text).toBe('Nested edit')
    expect(firstText(graph, outer.id)?.text).toBe('Nested edit')
  })

  test('makes every instance of the enclosing component follow a nested push', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const inner = graph.createNode('COMPONENT', page.id, { name: 'Inner' })
    graph.createNode('TEXT', inner.id, { name: 'Label', text: 'Inner' })
    const outer = graph.createNode('COMPONENT', page.id, { name: 'Outer' })
    graph.createInstance(inner.id, outer.id)
    const instance = expectDefined(graph.createInstance(outer.id, page.id), 'outer instance')
    const other = expectDefined(graph.createInstance(outer.id, page.id), 'other outer instance')
    const editor = createEditor({ graph, skipInitialGraphSetup: true })
    const nested = expectDefined(firstText(graph, instance.id), 'nested text')
    graph.updateNode(nested.id, { text: 'Nested edit' })
    recordInstanceOverride(graph, nested.id, ['text'])

    expect(editor.pushInstanceOverrides(instance.id)).toBe(true)

    expect(firstText(graph, other.id)?.text).toBe('Nested edit')
  })

  test('a pushed edit on a property-bound text becomes the property default', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const component = figma.createComponent()
    const label = expectDefined(figma.createText(), 'text')
    label.name = 'Label'
    label.characters = 'Main'
    component.appendChild(label)
    component.addComponentProperty('Title', 'TEXT', 'Main')
    const propertyId = expectDefined(
      graph
        .getNode(component.id)
        ?.componentPropertyDefinitions.find((definition) => definition.name === 'Title'),
      'Title property'
    ).id
    graph.updateNode(label.id, {
      componentPropertyReferences: [{ propertyId, field: 'TEXT' }]
    })
    const instance = expectDefined(component.createInstance(), 'instance')
    const copy = expectDefined(
      instance.children.find((child) => child.name === 'Label'),
      'text copy'
    )
    copy.characters = 'Instance title'
    const editor = createEditor({ graph, skipInitialGraphSetup: true })

    expect(editor.pushInstanceOverrides(instance.id)).toBe(true)

    const definition = graph
      .getNode(component.id)
      ?.componentPropertyDefinitions.find((item) => item.id === propertyId)
    expect(definition?.defaultValue).toBe('Instance title')
    expect(graph.getNode(label.id)?.text).toBe('Instance title')
    expect(editor.canPushInstanceOverrides(instance.id)).toBe(false)
  })

  test('refuses an instance of a library component', () => {
    const { graph, editor, component, instance, copyLabel } = setup()
    graph.updateNode(component.id, {
      librarySource: {
        identity: { libraryId: 'design-system', assetKey: 'card', revisionId: 'r1' },
        sourceNodeId: null,
        readOnly: true
      }
    })
    copyLabel.characters = 'Changed'

    expect(editor.canPushInstanceOverrides(instance.id)).toBe(false)
    expect(editor.pushInstanceOverrides(instance.id)).toBe(false)
    expect(firstText(graph, component.id)?.text).toBe('Main')
    expect(editor.instanceHasOverrides(instance.id)).toBe(true)
  })
})
