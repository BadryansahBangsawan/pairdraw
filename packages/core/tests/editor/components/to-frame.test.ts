import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { createComponentPropertyId } from '@pairdraw/scene-graph/components'

function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const frame = editor.graph.createNode('FRAME', pageId, { name: 'Card', width: 120, height: 80 })
  editor.graph.createNode('RECTANGLE', frame.id, { name: 'Body', width: 100, height: 40 })
  editor.select([frame.id])
  editor.createComponentFromSelection()
  const otherPage = editor.graph.createNode('CANVAS', editor.graph.rootId, { name: 'Other' })
  const here = editor.graph.createInstance(frame.id, pageId, { x: 200 })
  const there = editor.graph.createInstance(frame.id, otherPage.id)
  if (!here || !there) throw new Error('Expected instances')
  const node = (id: string) => editor.graph.getNode(id)
  return { editor, frame, here, there, node }
}

/** An icon component placed inside a Button main component, plus one instance of the Button. */
function nestedSetup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const icon = editor.graph.createNode('FRAME', pageId, { name: 'Icon', width: 16, height: 16 })
  editor.graph.createNode('RECTANGLE', icon.id, { name: 'Glyph', width: 16, height: 16 })
  editor.select([icon.id])
  editor.createComponentFromSelection()
  const button = editor.graph.createNode('FRAME', pageId, { name: 'Button', x: 100 })
  const nestedIcon = editor.graph.createInstance(icon.id, button.id)
  editor.select([button.id])
  editor.createComponentFromSelection()
  const buttonInstance = editor.graph.createInstance(button.id, pageId, { x: 300 })
  if (!nestedIcon || !buttonInstance) throw new Error('Expected instances')
  const copy = buttonInstance.childIds
    .map((id) => editor.graph.getNode(id))
    .find((child) => child?.componentId === nestedIcon.id)
  if (!copy) throw new Error('Expected the Button instance to copy the icon instance')
  return { editor, icon, nestedIcon, copy }
}

describe('convertComponentToFrame', () => {
  test('turns the main component into a frame and detaches its instances on every page', () => {
    const { editor, frame, here, there, node } = setup()
    expect(editor.componentInstanceCount(frame.id)).toBe(2)

    expect(editor.convertComponentToFrame(frame.id)).toBe(true)

    expect(node(frame.id)?.type).toBe('FRAME')
    expect(node(frame.id)?.childIds).toHaveLength(1)
    for (const id of [here.id, there.id]) {
      expect(node(id)).toMatchObject({ type: 'FRAME', componentId: null })
      expect(node(id)?.childIds).toHaveLength(1)
    }
    expect(editor.graph.getInstances(frame.id)).toEqual([])
    expect([...editor.state.selectedIds]).toEqual([frame.id])
  })

  test('undoes as one step that restores the component and its instances', () => {
    const { editor, frame, here, there, node } = setup()
    editor.convertComponentToFrame(frame.id)

    editor.undo.undo()
    expect(node(frame.id)?.type).toBe('COMPONENT')
    for (const id of [here.id, there.id]) {
      expect(node(id)).toMatchObject({ type: 'INSTANCE', componentId: frame.id })
    }
    expect(
      editor.graph
        .getInstances(frame.id)
        .map((instance) => instance.id)
        .toSorted()
    ).toEqual([here.id, there.id].toSorted())

    editor.undo.redo()
    expect(node(frame.id)?.type).toBe('FRAME')
    expect(node(there.id)?.type).toBe('FRAME')
    expect(editor.graph.getInstances(frame.id)).toEqual([])
  })

  test('detaches the copies that instances of a holding component make of its instances', () => {
    const { editor, icon, nestedIcon, copy } = nestedSetup()
    const node = (id: string) => editor.graph.getNode(id)
    expect(editor.componentInstanceCount(icon.id)).toBe(2)

    editor.convertComponentToFrame(icon.id)
    for (const id of [nestedIcon.id, copy.id]) {
      expect(node(id)).toMatchObject({ type: 'FRAME', componentId: null })
    }

    editor.undo.undo()
    expect(node(nestedIcon.id)).toMatchObject({ type: 'INSTANCE', componentId: icon.id })
    expect(node(copy.id)).toMatchObject({ type: 'INSTANCE', componentId: nestedIcon.id })
    expect(editor.graph.getInstances(nestedIcon.id).map((instance) => instance.id)).toEqual([
      copy.id
    ])
  })

  test('drops the component properties, their references and publishing, and undo restores them', () => {
    const { editor, frame, node } = setup()
    const propertyId = createComponentPropertyId()
    const [bodyId] = frame.childIds
    if (!bodyId) throw new Error('Expected a child')
    editor.graph.updateNode(frame.id, {
      componentPropertyDefinitions: [
        { id: propertyId, name: 'Show body', type: 'BOOLEAN', defaultValue: 'true' }
      ],
      componentKey: 'key',
      isPublishable: true
    })
    editor.graph.updateNode(bodyId, {
      componentPropertyReferences: [{ propertyId, field: 'VISIBLE' }]
    })

    editor.convertComponentToFrame(frame.id)
    expect(node(frame.id)).toMatchObject({
      type: 'FRAME',
      componentPropertyDefinitions: [],
      componentKey: null,
      isPublishable: false
    })
    expect(node(bodyId)?.componentPropertyReferences).toEqual([])

    editor.undo.undo()
    expect(node(frame.id)).toMatchObject({ type: 'COMPONENT', componentKey: 'key' })
    expect(node(frame.id)?.componentPropertyDefinitions).toHaveLength(1)
    expect(node(bodyId)?.componentPropertyReferences).toEqual([{ propertyId, field: 'VISIBLE' }])
  })

  test('leaves variants and other layers alone', () => {
    const { editor, frame, node } = setup()
    const pageId = editor.state.currentPageId
    const variant = editor.graph.createNode('COMPONENT', pageId, { name: 'State=Default' })
    editor.select([frame.id, variant.id])
    editor.createComponentSetFromComponents()

    expect(editor.canConvertToFrame(variant.id)).toBe(false)
    expect(editor.convertComponentToFrame(variant.id)).toBe(false)
    expect(node(variant.id)?.type).toBe('COMPONENT')

    const rect = editor.graph.createNode('RECTANGLE', pageId)
    expect(editor.canConvertToFrame(rect.id)).toBe(false)
  })

  test('asks the front end to confirm only for a component that can convert', () => {
    const { editor, frame } = setup()
    const requested: string[] = []
    const stop = editor.onEditorEvent('component:to-frame-requested', (id) => requested.push(id))
    const rect = editor.graph.createNode('RECTANGLE', editor.state.currentPageId)

    editor.requestComponentToFrame(rect.id)
    editor.requestComponentToFrame(frame.id)
    stop()

    expect(requested).toEqual([frame.id])
    expect(editor.graph.getNode(frame.id)?.type).toBe('COMPONENT')
  })
})
