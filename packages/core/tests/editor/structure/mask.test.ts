import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

/** A page-level rectangle with an ellipse over it, the layers a person would mask together. */
function pageWithOverlap() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const rect = editor.graph.createNode('RECTANGLE', pageId, {
    name: 'Shape',
    x: 20,
    y: 20,
    width: 200,
    height: 200
  })
  const ellipse = editor.graph.createNode('ELLIPSE', pageId, {
    name: 'Ellipse',
    x: 50,
    y: 50,
    width: 140,
    height: 140
  })
  // The ellipse starts over the rectangle and is sent behind it, as the report draws it.
  editor.graph.insertChildAt(ellipse.id, pageId, 0)
  editor.select([rect.id, ellipse.id])
  return { editor, pageId, rect, ellipse }
}

function children(editor: ReturnType<typeof createEditor>, parentId: string) {
  return (editor.graph.getNode(parentId)?.childIds ?? []).map((id) => editor.graph.getNode(id))
}

describe('maskSelected', () => {
  test('wraps page-level layers in a Mask group whose bottom layer is the mask', () => {
    const { editor, pageId, rect, ellipse } = pageWithOverlap()
    const beforeRect = editor.graph.getAbsolutePosition(rect.id)
    const beforeEllipse = editor.graph.getAbsolutePosition(ellipse.id)

    expect(editor.maskSelected()).toBe(true)

    const [group] = children(editor, pageId)
    expect(group?.type).toBe('GROUP')
    expect(group?.name).toBe('Mask group')
    if (!group) return
    expect(editor.graph.getNode(group.id)?.childIds).toEqual([ellipse.id, rect.id])
    expect(editor.graph.getNode(ellipse.id)?.isMask).toBe(true)
    expect(editor.graph.getNode(rect.id)?.isMask).toBe(false)
    // The layers stay where they were on the canvas.
    expect(editor.graph.getAbsolutePosition(rect.id)).toEqual(beforeRect)
    expect(editor.graph.getAbsolutePosition(ellipse.id)).toEqual(beforeEllipse)
    expect([...editor.state.selectedIds]).toEqual([group.id])
  })

  test('one undo step puts the layers back as they were', () => {
    const { editor, pageId, rect, ellipse } = pageWithOverlap()
    editor.maskSelected()
    const [group] = children(editor, pageId)
    if (!group) throw new Error('No mask group.')

    editor.undo.undo()
    expect(children(editor, pageId).map((node) => node?.id)).toEqual([ellipse.id, rect.id])
    expect(editor.graph.getNode(ellipse.id)?.isMask).toBe(false)
    expect(editor.graph.getNode(group.id)).toBeUndefined()

    editor.undo.redo()
    const [again] = children(editor, pageId)
    expect(again?.name).toBe('Mask group')
    expect(editor.graph.getNode(ellipse.id)?.isMask).toBe(true)
  })

  test('a single layer toggles its mask without grouping', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const rect = editor.graph.createNode('RECTANGLE', pageId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
    editor.select([rect.id])

    editor.maskSelected()
    expect(editor.graph.getNode(rect.id)?.isMask).toBe(true)
    expect(children(editor, pageId).map((node) => node?.id)).toEqual([rect.id])

    editor.maskSelected()
    expect(editor.graph.getNode(rect.id)?.isMask).toBe(false)
  })
})
