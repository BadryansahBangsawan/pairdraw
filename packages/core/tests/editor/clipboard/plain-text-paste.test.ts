import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { setTextMeasurer } from '@pairdraw/core/layout'

describe('pasting plain text', () => {
  test('creates one text layer centred on the point, selected and undone in one step', async () => {
    const editor = createEditor()

    expect(await editor.pastePlainText('Hello from another app', 200, 100)).toBe(true)

    const [text] = editor.graph.getChildren(editor.state.currentPageId)
    expect(text).toMatchObject({ type: 'TEXT', text: 'Hello from another app' })
    // Snapping to whole pixels keeps the layer within a pixel of the paste point.
    expect(Math.abs((text?.x ?? 0) + (text?.width ?? 0) / 2 - 200)).toBeLessThanOrEqual(1)
    expect(Math.abs((text?.y ?? 0) + (text?.height ?? 0) / 2 - 100)).toBeLessThanOrEqual(1)
    expect([...editor.state.selectedIds]).toEqual([text?.id])
    expect(editor.undo.undoLabel).toBe('Paste text')

    editor.undoAction()
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })

  test('lands inside the selected frame, as other pastes do', async () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', pageId, { name: 'Card', x: 100, y: 50 })
    editor.select([frame.id])

    expect(await editor.pastePlainText('Inside', 175, 75)).toBe(true)

    const [text] = editor.graph.getChildren(frame.id)
    expect(text).toMatchObject({ type: 'TEXT', text: 'Inside' })
  })

  test('keeps every line and the text as the layer name', async () => {
    const editor = createEditor()

    expect(await editor.pastePlainText('first line\nsecond line', 0, 0)).toBe(true)

    const [text] = editor.graph.getChildren(editor.state.currentPageId)
    expect(text?.text).toBe('first line\nsecond line')
    expect(text?.name).toBe('first line')
  })

  test('pastes nothing for blank text, so other paste handlers keep it', async () => {
    const editor = createEditor()

    expect(await editor.pastePlainText('   ', 0, 0)).toBe(false)
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })
})

describe('pasting plain text with a measurer', () => {
  afterEach(() => setTextMeasurer(null))

  test('sizes the layer to its content and lands on whole pixels', async () => {
    setTextMeasurer(() => ({ width: 120, height: 36 }))
    const editor = createEditor()

    expect(await editor.pastePlainText('Hello from Notes\nsecond line', 200.4, 100.6)).toBe(true)

    const [text] = editor.graph.getChildren(editor.state.currentPageId)
    expect(text).toMatchObject({ type: 'TEXT', width: 120, height: 36 })
    expect(Number.isInteger(text?.x)).toBe(true)
    expect(Number.isInteger(text?.y)).toBe(true)
    expect(text && text.x + text.width / 2).toBeCloseTo(200, 0)
    expect(text && text.y + text.height / 2).toBeCloseTo(101, 0)
  })
})
