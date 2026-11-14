import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'
import type { HyperlinkTarget } from '@pairdraw/scene-graph'

import {
  applyTextLink,
  closeTextLinkEditor,
  isTextLinkEditorOpen,
  openTextLinkEditor,
  removeTextLink,
  textLinkEdit,
  textLinkTargets,
  textLinkValue
} from '@/app/editor/links'

/** A script address, which links must refuse; the tests never run it. */
// eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
const SCRIPT_URL = 'javascript:alert(1)'

const SITE: HyperlinkTarget = { type: 'URL', value: 'https://example.com' }
const DOCS: HyperlinkTarget = { type: 'URL', value: 'https://example.com/docs' }

const editors: Editor[] = []

afterEach(() => {
  closeTextLinkEditor()
  for (const editor of editors.splice(0)) editor.dispose()
})

/** An editor with a text for each of `texts`, all selected. */
function editorWithTexts(...texts: string[]) {
  const editor = createEditor()
  editors.push(editor)
  const page = editor.state.currentPageId
  const ids = texts.map(
    (text) => editor.graph.createNode('TEXT', page, { text, width: 200, height: 24 }).id
  )
  editor.select(ids)
  return { editor, ids }
}

function linkOf(editor: Editor, id: string) {
  return editor.getTextHyperlink(id)?.link ?? null
}

describe('text link value', () => {
  test('is the link the texts share, none, or mixed', () => {
    const { editor, ids } = editorWithTexts('One', 'Two')
    expect(textLinkValue(editor, ids)).toBeNull()

    applyTextLink(editor, ids, SITE.value)
    expect(textLinkValue(editor, ids)).toEqual(SITE)

    applyTextLink(editor, [ids[1] ?? ''], DOCS.value)
    expect(textLinkValue(editor, ids)).toBe('mixed')

    removeTextLink(editor, [ids[1] ?? ''])
    expect(textLinkValue(editor, ids)).toBe('mixed')
  })

  test('acts on the selected texts only', () => {
    const { editor, ids } = editorWithTexts('Text')
    const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {}).id
    editor.select([...ids, frame])
    expect(textLinkTargets(editor)).toEqual(ids)
  })
})

describe('applying and removing links', () => {
  test('links several texts as one undo step', () => {
    const { editor, ids } = editorWithTexts('One', 'Two')

    expect(applyTextLink(editor, ids, 'example.com')).toBe(true)
    expect(ids.map((id) => linkOf(editor, id))).toEqual([SITE, SITE])

    editor.undoAction()
    expect(ids.map((id) => linkOf(editor, id))).toEqual([null, null])
  })

  test('removes links from several texts as one undo step', () => {
    const { editor, ids } = editorWithTexts('One', 'Two')
    applyTextLink(editor, ids, SITE.value)

    removeTextLink(editor, ids)
    expect(ids.map((id) => linkOf(editor, id))).toEqual([null, null])

    editor.undoAction()
    expect(ids.map((id) => linkOf(editor, id))).toEqual([SITE, SITE])
  })

  test('succeeds when one of the texts is empty, linking the others', () => {
    const { editor, ids } = editorWithTexts('One', '')

    expect(applyTextLink(editor, ids, SITE.value)).toBe(true)
    expect(linkOf(editor, ids[0] ?? '')).toEqual(SITE)
  })

  test('refuses an address that is not a web or mail link, changing nothing', () => {
    const { editor, ids } = editorWithTexts('One', 'Two')

    expect(applyTextLink(editor, ids, SCRIPT_URL)).toBe(false)
    expect(applyTextLink(editor, [ids[0] ?? ''], 'file:///etc/passwd')).toBe(false)
    expect(textLinkValue(editor, ids)).toBeNull()
    expect(editor.undo.canUndo).toBe(false)
  })
})

describe('link editor state', () => {
  test('opens for the selected texts and remembers what opened it', () => {
    const { editor, ids } = editorWithTexts('One')
    const other = createEditor()
    editors.push(other)

    openTextLinkEditor(editor)
    expect(textLinkEdit.value).toEqual({ editor, nodeIds: ids, opener: null })
    expect(isTextLinkEditorOpen(editor)).toBe(true)
    expect(isTextLinkEditorOpen(other)).toBe(false)

    closeTextLinkEditor()
    expect(isTextLinkEditorOpen(editor)).toBe(false)
  })

  test('stays closed when no text is selected', () => {
    const { editor } = editorWithTexts('One')
    editor.select([])

    openTextLinkEditor(editor)
    expect(textLinkEdit.value).toBeNull()
  })
})
