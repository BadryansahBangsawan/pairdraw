import { afterEach, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import type { HyperlinkTarget } from '@pairdraw/scene-graph'

/** A script address, which links must refuse; the tests never run it. */
// eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
const SCRIPT_URL = 'javascript:alert(1)'

const SITE: HyperlinkTarget = { type: 'URL', value: 'https://example.com' }

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

/** An editor with a renderer and the text "Hello world" at the page's origin. */
async function editorWithText() {
  const ck = await initCanvasKit()
  const surface = expectDefined(ck.MakeSurface(400, 200), 'surface')
  const renderer = new SkiaRenderer(ck, surface)
  const editor = createEditor()
  editor.setCanvasKit(ck, renderer)
  await renderer.loadFonts()
  cleanups.push(() => {
    editor.dispose()
    renderer.destroy()
  })
  const page = editor.state.currentPageId
  const text = editor.graph.createNode('TEXT', page, {
    text: 'Hello world',
    fontSize: 20,
    width: 300,
    height: 30
  })
  const node = () => expectDefined(editor.graph.getNode(text.id), 'text')
  return { editor, id: text.id, node }
}

describe('setTextHyperlink', () => {
  test('links the whole text of a selected layer as one undo step', async () => {
    const { editor, id, node } = await editorWithText()

    expect(editor.setTextHyperlink(id, 'example.com')).toBe(true)

    expect(node().styleRuns).toEqual([
      { start: 0, length: 11, style: { hyperlink: SITE, textDecoration: 'UNDERLINE' } }
    ])
    expect(editor.getTextHyperlink(id)?.link).toEqual(SITE)
    editor.undoAction()
    expect(node().styleRuns).toEqual([])
    expect(editor.getTextHyperlink(id)?.link).toBeNull()
  })

  test('links the selected characters while the text is edited', async () => {
    const { editor, id, node } = await editorWithText()
    editor.startTextEditing(id)
    const state = expectDefined(editor.textEditor?.state, 'text editor state')
    state.selectionAnchor = 6
    state.cursor = 11

    expect(editor.setTextHyperlink(id, 'https://example.com')).toBe(true)

    expect(node().styleRuns).toEqual([
      { start: 6, length: 5, style: { hyperlink: SITE, textDecoration: 'UNDERLINE' } }
    ])
    // The caret inside the link edits all of it.
    state.selectionAnchor = null
    state.cursor = 8
    expect(editor.getTextHyperlink(id)).toMatchObject({ start: 6, end: 11, link: SITE })
    expect(editor.setTextHyperlink(id, null)).toBe(true)
    expect(node().styleRuns).toEqual([
      { start: 6, length: 5, style: { textDecoration: 'UNDERLINE' } }
    ])
    editor.undoAction()
    expect(editor.getTextHyperlink(id)?.link).toEqual(SITE)
  })

  test('refuses addresses that are not web or mail links', async () => {
    const { editor, id, node } = await editorWithText()

    expect(editor.setTextHyperlink(id, SCRIPT_URL)).toBe(false)
    expect(editor.setTextHyperlink(id, 'file:///etc/passwd')).toBe(false)
    expect(node().styleRuns).toEqual([])
    expect(editor.undo.canUndo).toBe(false)
  })

  test('is refused in a read-only document, which still reads links', async () => {
    const { editor, id, node } = await editorWithText()
    editor.setTextHyperlink(id, 'https://example.com')
    editor.setReadOnly(true)

    expect(() => editor.setTextHyperlink(id, null)).toThrow()
    expect(node().styleRuns[0]?.style.hyperlink).toEqual(SITE)
    expect(editor.getTextHyperlink(id)?.link).toEqual(SITE)
  })
})

describe('following links from the canvas', () => {
  test('finds the link under a point on its glyphs only', async () => {
    const { editor, id } = await editorWithText()
    editor.setTextHyperlink(id, 'https://example.com', [6, 11])

    const onWorld = editor.hyperlinkAtPoint(80, 15)
    expect(onWorld).toEqual({ nodeId: id, span: { start: 6, end: 11, link: SITE } })
    expect(editor.hyperlinkAtPoint(5, 15)).toBeNull()
    expect(editor.hyperlinkAtPoint(250, 15)).toBeNull()
  })

  test('hands a web link to the front end and refuses other schemes', async () => {
    const { editor } = await editorWithText()
    const opened: string[] = []
    cleanups.push(editor.onEditorEvent('hyperlink:open', (url) => opened.push(url)))

    expect(await editor.followHyperlink(SITE)).toBe(true)
    expect(await editor.followHyperlink({ type: 'URL', value: SCRIPT_URL })).toBe(false)
    expect(await editor.followHyperlink({ type: 'URL', value: 'tel:+123' })).toBe(false)
    expect(opened).toEqual(['https://example.com'])
  })

  test('shows and selects a linked layer on another page', async () => {
    const { editor } = await editorWithText()
    const other = editor.graph.addPage('Other')
    const frame = editor.graph.createNode('FRAME', other.id, { width: 100, height: 100 })

    expect(await editor.followHyperlink({ type: 'NODE', value: frame.id })).toBe(true)

    expect(editor.state.currentPageId).toBe(other.id)
    expect([...editor.state.selectedIds]).toEqual([frame.id])
    expect(await editor.followHyperlink({ type: 'NODE', value: 'missing' })).toBe(false)
  })
})
