import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

function setup() {
  const editor = createEditor()
  const page = editor.state.currentPageId
  const card = editor.graph.createNode('FRAME', page, {
    name: 'Card',
    width: 200,
    height: 100,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
  })
  editor.graph.createNode('TEXT', card.id, { name: 'Title', text: 'Hello', width: 100, height: 20 })
  return { editor, card }
}

describe('copySelectionAsHTML', () => {
  test('writes the layers as one HTML fragment with inline styles', async () => {
    const { editor, card } = setup()
    const html = await editor.copySelectionAsHTML([card.id])
    expect(html).not.toBeNull()
    expect(html).not.toContain('<html')
    expect(html).not.toContain('<style')
    expect(html).toContain('background-color: #FF0000')
    expect(html).toContain('>Hello</span>')
  })

  test('copies nothing without layers', async () => {
    const { editor } = setup()
    expect(await editor.copySelectionAsHTML([])).toBeNull()
  })

  test('still copies from a read-only document', async () => {
    const { editor, card } = setup()
    editor.setReadOnly(true)
    expect(await editor.copySelectionAsHTML([card.id])).toContain('Hello')
  })
})

describe('copySelectionAsHTML of a selection that draws nothing', () => {
  test('copies nothing for a frame with no paint and no children', async () => {
    const editor = createEditor()
    const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      name: 'Empty',
      width: 100,
      height: 100
    })
    expect(await editor.copySelectionAsHTML([frame.id])).toBeNull()
  })
})

test('copies a frame whose only paint is a background blur', async () => {
  const editor = createEditor()
  const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
    name: 'Frosted',
    width: 100,
    height: 100,
    effects: [
      {
        type: 'BACKGROUND_BLUR',
        color: { r: 0, g: 0, b: 0, a: 0 },
        offset: { x: 0, y: 0 },
        radius: 8,
        spread: 0,
        visible: true
      }
    ]
  })
  const html = await editor.copySelectionAsHTML([frame.id])
  expect(html).not.toBeNull()
  expect(html).toContain('backdrop-filter')
})
