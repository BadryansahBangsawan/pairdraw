import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import type { DesignDocument } from '@open-pencil/dom-css'
import { getAxisAlignedBoundsInParent } from '@open-pencil/scene-graph/coordinate'

const CARD: DesignDocument = {
  type: 'document',
  children: [
    {
      type: 'element',
      tagName: 'div',
      attrs: { class: 'card' },
      computedStyle: {
        display: 'flex',
        'flex-direction': 'column',
        width: '200px',
        height: '120px',
        'background-color': 'rgb(255, 0, 0)'
      },
      children: [
        {
          type: 'element',
          tagName: 'p',
          attrs: {},
          computedStyle: { display: 'block', 'font-size': '16px', color: 'rgb(0, 0, 0)' },
          children: [{ type: 'text', text: 'Hello' }]
        }
      ]
    }
  ]
}

describe('pasting a styled DOM', () => {
  test('pastes its layers centred on the cursor, selected, as one undo step', async () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const created = await editor.pasteStyledDocument(CARD, { x: 400, y: 300 }, { name: 'Pricing' })

    expect(created).toHaveLength(1)
    const [card] = editor.graph.getChildren(pageId)
    expect(card).toMatchObject({ type: 'FRAME', name: 'Pricing', width: 200, height: 120 })
    expect(card?.fills[0]).toMatchObject({ type: 'SOLID', color: { r: 1, g: 0, b: 0 } })
    const texts = editor.graph
      .getChildren(card?.id ?? '')
      .flatMap((child) => [child, ...editor.graph.getChildren(child.id)])
      .filter((node) => node.type === 'TEXT')
    expect(texts.map((node) => node.text)).toEqual(['Hello'])
    const bounds = getAxisAlignedBoundsInParent(card ? [card] : [], pageId, editor.graph)
    expect(bounds.x + bounds.width / 2).toBeCloseTo(400, 0)
    expect(bounds.y + bounds.height / 2).toBeCloseTo(300, 0)
    expect([...editor.state.selectedIds]).toEqual(created)
    expect(editor.undo.undoLabel).toBe('Paste')

    editor.undoAction()
    expect(editor.graph.getChildren(pageId)).toHaveLength(0)
    editor.redoAction()
    expect(editor.graph.getChildren(pageId).map((node) => node.name)).toEqual(['Pricing'])
  })

  test('keeps layer names when the content is more than one box', async () => {
    const editor = createEditor()
    const [first] = CARD.children
    if (!first) throw new Error('fixture has a card')
    const twoCards: DesignDocument = { type: 'document', children: [first, first] }

    const created = await editor.pasteStyledDocument(twoCards, undefined, { name: 'Ignored' })

    expect(created).toHaveLength(2)
    expect(created.map((id) => editor.graph.getNode(id)?.name)).toEqual(['card', 'card'])
  })

  test('pastes nothing for a document without content', async () => {
    const editor = createEditor()
    expect(await editor.pasteStyledDocument({ type: 'document', children: [] })).toEqual([])
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
    expect(editor.undo.canUndo).toBe(false)
  })
})
