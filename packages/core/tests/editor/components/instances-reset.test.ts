import { beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { registerTestFont, solidFill } from '#core-tests/helpers/figma-api'

import { createEditor } from '@pairdraw/core'
import { FigmaAPI, type FigmaNodeProxy } from '@pairdraw/core/figma-api'
import { SceneGraph, type SceneGraph as Graph, type SceneNode } from '@pairdraw/scene-graph'

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
  return { graph, editor, instance, copyBox, copyLabel }
}

const fillColor = (node: FigmaNodeProxy) => {
  const fills = node.fills
  if (!Array.isArray(fills)) return undefined
  const [fill] = fills as { color?: { r: number; g: number; b: number } }[]
  return fill?.color
}

/** The first text layer under `id`, through nested instances. */
function firstText(graph: Graph, id: string): SceneNode | undefined {
  for (const child of graph.getChildren(id)) {
    if (child.type === 'TEXT') return child
    const nested = firstText(graph, child.id)
    if (nested) return nested
  }
  return undefined
}

describe('resetting an instance', () => {
  test('reports an instance with edits as one that has overrides', () => {
    const { editor, instance, copyLabel } = setup()
    expect(editor.instanceHasOverrides(instance.id)).toBe(false)
    copyLabel.characters = 'Changed'
    expect(editor.instanceHasOverrides(instance.id)).toBe(true)
  })

  test('gives the instance back its component over one undo step', () => {
    const { graph, editor, instance, copyBox, copyLabel } = setup()
    copyBox.fills = [solidFill({ r: 1, g: 0, b: 0, a: 1 })]
    copyLabel.characters = 'Changed'

    editor.resetInstanceOverrides(instance.id)

    expect(fillColor(copyBox)).toEqual({ r: 0, g: 1, b: 0 })
    expect(copyLabel.characters).toBe('Main')
    expect(editor.instanceHasOverrides(instance.id)).toBe(false)

    editor.undoAction()
    expect(fillColor(copyBox)).toEqual({ r: 1, g: 0, b: 0 })
    expect(graph.getNode(copyLabel.id)?.text).toBe('Changed')
  })

  test('resets the instances inside it too', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const inner = figma.createComponent()
    inner.name = 'Inner'
    const innerLabel = expectDefined(figma.createText(), 'text')
    innerLabel.name = 'Label'
    innerLabel.characters = 'Inner'
    inner.appendChild(innerLabel)
    const outer = figma.createComponent()
    outer.name = 'Outer'
    outer.appendChild(expectDefined(inner.createInstance(), 'nested instance'))
    const instance = expectDefined(outer.createInstance(), 'outer instance')
    const editor = createEditor({ graph, skipInitialGraphSetup: true })
    const nested = expectDefined(firstText(graph, instance.id), 'nested text')
    graph.updateNode(nested.id, { text: 'Nested edit' })

    editor.resetInstanceOverrides(instance.id)

    expect(graph.getNode(nested.id)?.text).toBe('Inner')
  })
})
