import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

const VIEWPORT = { width: 800, height: 600 }

function editorWithPages() {
  const editor = createEditor({ getViewportSize: () => VIEWPORT })
  const first = editor.state.currentPageId
  return { editor, first }
}

describe('a page edit is one undo step, as in Figma', () => {
  test('deleting a page restores it with its layers, its place and its view', async () => {
    const { editor, first } = editorWithPages()
    const second = editor.addPage('Second')
    editor.graph.createNode('RECTANGLE', second, { x: 10, y: 20, width: 30, height: 40 })
    editor.addPage('Third')
    await editor.switchPage(second)

    await editor.deletePage(second)

    expect(editor.graph.getPages().map((page) => page.name)).toEqual(['Page 1', 'Third'])
    expect(editor.state.currentPageId).not.toBe(second)

    editor.undo.undo()

    const pages = editor.graph.getPages()
    expect(pages.map((page) => page.name)).toEqual(['Page 1', 'Second', 'Third'])
    const restored = pages[1]
    expect(restored.id).toBe(second)
    expect(editor.graph.getChildren(second).map((node) => node.type)).toEqual(['RECTANGLE'])
    expect(editor.state.currentPageId).toBe(second)

    editor.undo.redo()

    expect(editor.graph.getPages().map((page) => page.name)).toEqual(['Page 1', 'Third'])
    expect(editor.graph.getNode(second)).toBeUndefined()
    expect(editor.state.currentPageId).not.toBe(second)
    expect(first).toBeTruthy()
  })

  test('adding a page is undone by removing it and returning to the page before it', async () => {
    const { editor, first } = editorWithPages()
    await editor.switchPage(first)

    const added = editor.addPage('Added')
    await editor.switchPage(added)

    editor.undo.undo()

    expect(editor.graph.getPages().map((page) => page.name)).toEqual(['Page 1'])
    expect(editor.state.currentPageId).toBe(first)

    editor.undo.redo()

    expect(editor.graph.getPages().map((page) => page.name)).toEqual(['Page 1', 'Added'])
    expect(editor.state.currentPageId).toBe(added)
  })

  test('renaming a page is undone back to its name', () => {
    const { editor } = editorWithPages()
    const page = editor.state.currentPageId

    editor.renamePage(page, 'Cover')
    expect(editor.graph.getNode(page)?.name).toBe('Cover')

    editor.undo.undo()
    expect(editor.graph.getNode(page)?.name).toBe('Page 1')

    editor.undo.redo()
    expect(editor.graph.getNode(page)?.name).toBe('Cover')
  })

  test('moving a page is undone back to its place', () => {
    const { editor } = editorWithPages()
    const second = editor.addPage('Second')
    editor.addPage('Third')

    editor.movePage(second, 2)
    expect(editor.graph.getPages().map((page) => page.name)).toEqual([
      'Page 1',
      'Third',
      'Second'
    ])

    editor.undo.undo()
    expect(editor.graph.getPages().map((page) => page.name)).toEqual([
      'Page 1',
      'Second',
      'Third'
    ])

    editor.undo.redo()
    expect(editor.graph.getPages().map((page) => page.name)).toEqual([
      'Page 1',
      'Third',
      'Second'
    ])
  })
})
