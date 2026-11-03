import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor, type Editor } from '@open-pencil/core'
import { buildOpenPencilClipboardHTML } from '@open-pencil/core/clipboard'
import { isReplacedLayer } from '@open-pencil/scene-graph/instances'

function copiedStarHTML() {
  const source = createEditor()
  const star = source.graph.createNode('STAR', source.state.currentPageId, {
    name: 'Star',
    width: 20,
    height: 20
  })
  return buildOpenPencilClipboardHTML([star], source.graph)
}

/** A button component with an icon and a label, and an instance of it. */
function buttonInstance(editor: Editor) {
  const pageId = editor.state.currentPageId
  const button = editor.graph.createNode('COMPONENT', pageId, { name: 'Button', width: 120 })
  editor.graph.createNode('RECTANGLE', button.id, { name: 'Icon', x: 8, y: 8, width: 24 })
  editor.graph.createNode('RECTANGLE', button.id, { name: 'Label', x: 40, y: 8, width: 60 })
  const instance = expectDefined(editor.graph.createInstance(button.id, pageId, { x: 300 }))
  return { pageId, button, instance }
}

const childTypes = (editor: Editor, id: string) =>
  editor.graph.getChildren(id).map((node) => `${node.type}:${node.name}`)

describe('replace inside instance', () => {
  test('pastes the clipboard in place of the selected instance layer as one undo step', async () => {
    const editor = createEditor()
    const { pageId, instance } = buttonInstance(editor)
    const [icon] = editor.graph.getChildren(instance.id)
    editor.select([icon.id])
    const pageLayers = editor.graph.getChildren(pageId).length

    await editor.pasteFromHTML(copiedStarHTML(), undefined, { replaceInInstance: true })

    const [star] = editor.graph.getChildren(instance.id)
    expect(childTypes(editor, instance.id)).toEqual(['STAR:Star', 'RECTANGLE:Label'])
    expect(isReplacedLayer(editor.graph, star)).toBe(true)
    expect(editor.graph.getChildren(pageId)).toHaveLength(pageLayers)
    expect([...editor.state.selectedIds]).toEqual([star.id])

    editor.undoAction()
    expect(childTypes(editor, instance.id)).toEqual(['RECTANGLE:Icon', 'RECTANGLE:Label'])
    expect(editor.graph.getNode(star.id)).toBeUndefined()
    expect(editor.graph.getChildren(pageId)).toHaveLength(pageLayers)

    editor.redoAction()
    expect(childTypes(editor, instance.id)).toEqual(['STAR:Star', 'RECTANGLE:Label'])
    const redone = expectDefined(editor.graph.getNode(star.id))
    expect(isReplacedLayer(editor.graph, redone)).toBe(true)
  })

  test('replaces each selected instance layer, the others with copies', async () => {
    const editor = createEditor()
    const { pageId, button } = buttonInstance(editor)
    const second = expectDefined(editor.graph.createInstance(button.id, pageId, { x: 600 }))
    const first = expectDefined(
      editor.graph.getChildren(pageId).find((node) => node.type === 'INSTANCE')
    )
    editor.select([
      editor.graph.getChildren(first.id)[0].id,
      editor.graph.getChildren(second.id)[0].id
    ])

    await editor.pasteFromHTML(copiedStarHTML(), undefined, { replaceInInstance: true })

    expect(childTypes(editor, first.id)[0]).toBe('STAR:Star')
    expect(childTypes(editor, second.id)[0]).toBe('STAR:Star')
    expect(editor.state.selectedIds.size).toBe(2)
  })

  test('pastes normally when nothing selected is inside an instance', async () => {
    const editor = createEditor()
    const { pageId, instance } = buttonInstance(editor)
    editor.select([instance.id])
    const before = editor.graph.getChildren(pageId).length

    await editor.pasteFromHTML(copiedStarHTML(), undefined, { replaceInInstance: true })

    expect(editor.graph.getChildren(pageId)).toHaveLength(before + 1)
    expect(childTypes(editor, instance.id)).toEqual(['RECTANGLE:Icon', 'RECTANGLE:Label'])
  })

  test('offers only unlocked layers an instance copies from its component', () => {
    const editor = createEditor()
    const { button, instance } = buttonInstance(editor)
    const [icon, label] = editor.graph.getChildren(instance.id)
    editor.graph.updateNode(label.id, { locked: true })
    expect(editor.replaceableInstanceLayers([icon.id, label.id, instance.id, button.id])).toEqual([
      icon.id
    ])
  })

  test('restoring a replaced layer brings the component layer back, undoably', async () => {
    const editor = createEditor()
    const { instance } = buttonInstance(editor)
    editor.select([editor.graph.getChildren(instance.id)[0].id])
    await editor.pasteFromHTML(copiedStarHTML(), undefined, { replaceInInstance: true })
    const [star] = editor.graph.getChildren(instance.id)

    expect(editor.restoreReplacedInstanceLayer(star.id)).toBe(true)
    expect(childTypes(editor, instance.id)).toEqual(['RECTANGLE:Icon', 'RECTANGLE:Label'])

    editor.undoAction()
    expect(childTypes(editor, instance.id)).toEqual(['STAR:Star', 'RECTANGLE:Label'])
  })
})

describe('duplicating an instance with a replaced layer', () => {
  test('keeps the replacement as the duplicate’s own through a sync', async () => {
    const editor = createEditor()
    const { button, instance } = buttonInstance(editor)
    editor.select([editor.graph.getChildren(instance.id)[0].id])
    await editor.pasteFromHTML(copiedStarHTML(), undefined, { replaceInInstance: true })

    editor.select([instance.id])
    editor.duplicateSelected()
    const [duplicate] = editor.state.selectedIds
    editor.graph.syncInstances(button.id)

    expect(childTypes(editor, duplicate)).toEqual(['STAR:Star', 'RECTANGLE:Label'])
    expect(isReplacedLayer(editor.graph, editor.graph.getChildren(duplicate)[0])).toBe(true)
    expect(childTypes(editor, instance.id)).toEqual(['STAR:Star', 'RECTANGLE:Label'])
  })
})

describe('swapping an instance from its header', () => {
  test('swaps a nested instance to any component, as one undo step', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const icon = editor.graph.createNode('COMPONENT', pageId, { name: 'Icon' })
    editor.graph.createNode('RECTANGLE', icon.id, { name: 'Shape' })
    const other = editor.graph.createNode('COMPONENT', pageId, { name: 'Other icon' })
    editor.graph.createNode('ELLIPSE', other.id, { name: 'Dot' })
    const card = editor.graph.createNode('COMPONENT', pageId, { name: 'Card' })
    expectDefined(editor.graph.createInstance(icon.id, card.id))
    const outer = expectDefined(editor.graph.createInstance(card.id, pageId, { x: 300 }))
    const nested = editor.graph.getChildren(outer.id)[0]

    expect(editor.swapInstance(nested.id, other.id)).toBe(true)
    expect(editor.graph.getNode(nested.id)?.componentId).toBe(other.id)
    expect(childTypes(editor, nested.id)).toEqual(['ELLIPSE:Dot'])

    // The swap is an override of the outer instance, so a sync of its component keeps it.
    editor.graph.syncInstances(card.id)
    expect(editor.graph.getNode(nested.id)?.componentId).toBe(other.id)

    editor.undoAction()
    expect(childTypes(editor, nested.id)).toEqual(['RECTANGLE:Shape'])
  })

  test('refuses a component that would contain itself', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const card = editor.graph.createNode('COMPONENT', pageId, { name: 'Card' })
    const icon = editor.graph.createNode('COMPONENT', pageId, { name: 'Icon' })
    const nested = expectDefined(editor.graph.createInstance(icon.id, card.id))
    expect(editor.swapInstance(nested.id, card.id)).toBe(false)
    expect(editor.graph.getNode(nested.id)?.componentId).toBe(icon.id)
  })
})
