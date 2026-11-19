import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

describe('undo of a property edit', () => {
  test('drops the edited mark the edit added, and redo marks it again', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const node = editor.graph.createNode('RECTANGLE', page, {})
    editor.undo.clear()
    expect(node.source.editedFields).toEqual([])

    editor.updateNodeWithUndo(node.id, { width: 140 })
    expect(node.source.editedFields).toContain('width')

    editor.undo.undo()
    expect(node.width).toBe(100)
    expect(node.source.editedFields).toEqual([])

    editor.undo.redo()
    expect(node.width).toBe(140)
    expect(node.source.editedFields).toContain('width')
  })

  test('a previewed drag marks its fields for the step and takes them back when undone', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const node = editor.graph.createNode('RECTANGLE', page, { x: 0, y: 0 })
    editor.undo.clear()

    const preview = editor.beginNodePreview('Move')
    preview.update(node.id, { x: 40, y: 50 })
    preview.commit()
    expect(node.source.editedFields).toEqual(['x', 'y'])

    editor.undo.undo()
    expect(node.x).toBe(0)
    expect(node.source.editedFields).toEqual([])

    editor.undo.redo()
    expect(node.x).toBe(40)
    expect(node.source.editedFields).toEqual(['x', 'y'])
  })

  test('a step that marks nothing leaves the later steps of the same layer unmarked', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const node = editor.graph.createNode('RECTANGLE', page, {})
    editor.undo.clear()

    editor.updateNodeWithUndo(node.id, { width: 140 })
    editor.undo.undo()
    editor.undo.redo()
    editor.undo.undo()
    expect(node.source.editedFields).toEqual([])
  })
})
