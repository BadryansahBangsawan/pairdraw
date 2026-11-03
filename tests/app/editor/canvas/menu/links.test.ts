import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@open-pencil/core'
import type { MenuEntry } from '@open-pencil/vue/editor/menu-model'

import { textLinkMenuEntries } from '@/app/editor/canvas/menu/links'
import { applyTextLink, closeTextLinkEditor, textLinkEdit } from '@/app/editor/links'

const LABELS = {
  addTextLink: 'Add link',
  editTextLink: 'Edit link',
  openTextLink: 'Open link',
  removeTextLink: 'Remove link'
}

const editors: Editor[] = []

afterEach(() => {
  closeTextLinkEditor()
  for (const editor of editors.splice(0)) editor.dispose()
})

function editorWithText() {
  const editor = createEditor()
  editors.push(editor)
  const id = editor.graph.createNode('TEXT', editor.state.currentPageId, {
    text: 'Read the docs',
    width: 200,
    height: 24
  }).id
  editor.select([id])
  return { editor, id }
}

function labels(entries: MenuEntry[]) {
  return entries.flatMap((entry) => ('label' in entry ? [entry.label] : []))
}

describe('canvas menu link entries', () => {
  test('offer adding a link to a text without one', () => {
    const { editor, id } = editorWithText()
    const entries = textLinkMenuEntries(editor, LABELS)
    expect(labels(entries)).toEqual(['Add link'])

    const add = entries.find((entry) => 'label' in entry && entry.label === 'Add link')
    if (add && 'action' in add) add.action?.()
    expect(textLinkEdit.value?.nodeIds).toEqual([id])
  })

  test('offer editing, opening, and removing a link', () => {
    const { editor, id } = editorWithText()
    applyTextLink(editor, [id], 'https://openpencil.dev')

    expect(labels(textLinkMenuEntries(editor, LABELS))).toEqual([
      'Edit link',
      'Open link',
      'Remove link'
    ])
  })

  test('only open links in a read-only document', () => {
    const { editor, id } = editorWithText()
    applyTextLink(editor, [id], 'https://openpencil.dev')
    editor.setReadOnly(true)

    expect(labels(textLinkMenuEntries(editor, LABELS))).toEqual(['Open link'])
  })

  test('are left out when no text is selected', () => {
    const { editor } = editorWithText()
    editor.select([])
    expect(textLinkMenuEntries(editor, LABELS)).toEqual([])
  })
})
