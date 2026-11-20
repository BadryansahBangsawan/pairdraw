import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

describe('a page', () => {
  test('refuses auto layout, and keeps none', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId

    expect(() => editor.setLayoutMode(page, 'HORIZONTAL')).toThrow(/cannot hold auto layout/)
    expect(editor.graph.getNode(page)?.layoutMode).toBe('NONE')
    expect(editor.undo.canUndo).toBe(false)
  })

  test('refuses the layout properties an update carries', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId

    expect(() => editor.updateNodeWithUndo(page, { counterAxisAlign: 'BASELINE' })).toThrow(
      /cannot hold auto layout/
    )
    expect(editor.graph.getNode(page)?.counterAxisAlign).toBe('MIN')
  })
})
