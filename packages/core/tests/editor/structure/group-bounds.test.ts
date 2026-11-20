import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'

function grouped() {
  const editor = createEditor()
  const page = editor.state.currentPageId
  const first = editor.graph.createNode('RECTANGLE', page, { name: 'A', width: 20, height: 20 })
  const second = editor.graph.createNode('RECTANGLE', page, {
    name: 'B',
    x: 60,
    width: 20,
    height: 20
  })
  editor.select([first.id, second.id])
  editor.groupSelected()
  const group = getNodeOrThrow(editor.graph, editor.graph.getChildren(page)[0]?.id ?? '')
  return { editor, first, second, group }
}

describe('a group box', () => {
  test('follows a child that moves left of it', () => {
    const { editor, first, group } = grouped()

    // Figma's group is its children's bounds, so moving one child out moves the box with it.
    editor.updateNodeWithUndo(first.id, { x: -30 })

    expect(getNodeOrThrow(editor.graph, group.id).x).toBe(-30)
    expect(getNodeOrThrow(editor.graph, group.id).width).toBe(110)
  })

  test('follows a child that grows', () => {
    const { editor, second, group } = grouped()

    editor.updateNodeWithUndo(second.id, { width: 100 })

    expect(getNodeOrThrow(editor.graph, group.id).width).toBe(160)
  })

  test('goes back with the child on undo', () => {
    const { editor, first, group } = grouped()
    editor.updateNodeWithUndo(first.id, { x: -30 })

    editor.undoAction()

    expect(getNodeOrThrow(editor.graph, group.id).x).toBe(0)
    expect(getNodeOrThrow(editor.graph, first.id).x).toBe(0)
  })
})
