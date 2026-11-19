import { afterEach, describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'

import { createEditor, type Editor } from '@pairdraw/core'
import { getStyleAt, TextEditor } from '@pairdraw/core/text'
import type { CharacterStyleOverride, StyleRun } from '@pairdraw/scene-graph'
import { colorToFill } from '@pairdraw/scene-graph/color'

import { createTextEditActions } from '#vue/canvas/text-edit/editing'

const WHITE = colorToFill('#ffffff')
const BLACK = colorToFill('#000000')
const RED = colorToFill('#ff0000')
const WHITE_RUN: CharacterStyleOverride = { fills: [WHITE] }
const RED_RUN: CharacterStyleOverride = { fills: [RED] }
const BOLD_BOUND_RUN: CharacterStyleOverride = {
  fontFamily: 'Inter',
  fontWeight: 700,
  boundVariables: { fontSize: 'VariableID:1:1' }
}

let editor: Editor

afterEach(() => editor.dispose())

function editStyledText(text: string, styleRuns: StyleRun[]) {
  editor = createEditor()
  const node = editor.graph.createNode('TEXT', editor.state.currentPageId, {
    text,
    fills: [BLACK],
    styleRuns
  })
  // Without a renderer, the editor lays nothing out; typing only moves the runs.
  const canvasKitUnusedWithoutRenderer: CanvasKit = Object.create(null)
  const textEditor = new TextEditor(canvasKitUnusedWithoutRenderer)
  const store: Editor = Object.create(editor)
  Object.defineProperty(store, 'textEditor', { value: textEditor })
  editor.state.editingTextId = node.id
  textEditor.start(node)
  const read = () => editor.graph.getNode(node.id) ?? node
  return { read, store, textEditor, actions: createTextEditActions(store) }
}

function editWhiteRunText(text: string) {
  return editStyledText(text, [{ start: 0, length: text.length, style: WHITE_RUN }])
}

type EditedText = ReturnType<typeof editStyledText>

function fillAt(text: EditedText, index: number) {
  return getStyleAt(text.read().styleRuns, index).fills ?? text.read().fills
}

function placeCaret(text: EditedText, cursor: number, selectionAnchor: number | null = null) {
  const state = text.textEditor.state
  if (state) {
    state.cursor = cursor
    state.selectionAnchor = selectionAnchor
  }
}

describe('typing into text coloured by its character runs', () => {
  test('a new line typed at the end keeps the colour of the line before it', () => {
    const text = editWhiteRunText('Title')
    text.actions.insertText('\n', text.read())
    text.actions.insertText('Next', text.read())

    expect(text.read().text).toBe('Title\nNext')
    expect(fillAt(text, 5)).toEqual([WHITE])
    expect(fillAt(text, 9)).toEqual([WHITE])
  })

  test('characters typed at the start take the colour of the first character', () => {
    const text = editWhiteRunText('Title')
    placeCaret(text, 0)
    text.actions.insertText('A', text.read())

    expect(text.read().text).toBe('ATitle')
    expect(fillAt(text, 0)).toEqual([WHITE])
  })

  test('typing over the whole selection keeps the colour of the replaced text', () => {
    const text = editWhiteRunText('Title')
    text.textEditor.selectAll()
    text.actions.insertText('New', text.read())

    expect(text.read().text).toBe('New')
    expect(fillAt(text, 0)).toEqual([WHITE])
    expect(fillAt(text, 2)).toEqual([WHITE])
  })

  test('typing over a selection takes the style of its first character', () => {
    const text = editStyledText('Lead tail', [{ start: 0, length: 4, style: WHITE_RUN }])
    placeCaret(text, 7, 2)
    text.actions.insertText('xy', text.read())

    expect(text.read().text).toBe('Lexyil')
    expect(fillAt(text, 2)).toEqual([WHITE])
    expect(fillAt(text, 3)).toEqual([WHITE])
    expect(fillAt(text, 4)).toEqual([BLACK])
  })

  test('typing at the end of a run keeps that run over the base style after it', () => {
    const text = editStyledText('Lead tail', [{ start: 0, length: 4, style: WHITE_RUN }])
    placeCaret(text, 4)
    text.actions.insertText('s', text.read())

    expect(text.read().text).toBe('Leads tail')
    expect(fillAt(text, 4)).toEqual([WHITE])
    expect(fillAt(text, 5)).toEqual([BLACK])
  })

  test('typing into a text without characters adds no runs', () => {
    const text = editStyledText('', [])
    text.actions.insertText('A', text.read())

    expect(text.read().text).toBe('A')
    expect(text.read().styleRuns).toEqual([])
  })

  test('font weight and bound variables survive typing at the end of a run', () => {
    const text = editStyledText('Bold', [{ start: 0, length: 4, style: BOLD_BOUND_RUN }])
    text.actions.insertText('er', text.read())

    expect(text.read().text).toBe('Bolder')
    expect(getStyleAt(text.read().styleRuns, 5)).toEqual(BOLD_BOUND_RUN)
  })

  test('typing over a selection across several runs takes the style of its first character', () => {
    const text = editStyledText('abcdef', [
      { start: 0, length: 2, style: WHITE_RUN },
      { start: 2, length: 2, style: RED_RUN }
    ])
    placeCaret(text, 5, 1)
    text.actions.insertText('X', text.read())

    expect(text.read().text).toBe('aXf')
    expect(fillAt(text, 1)).toEqual([WHITE])
    expect(fillAt(text, 2)).toEqual([BLACK])
  })

  test('an input method composition at the end of a run keeps the run colour', () => {
    const text = editWhiteRunText('Title')
    text.actions.replaceComposedText('k', text.read())
    text.actions.replaceComposedText('ka', text.read())
    text.actions.finishComposition()

    expect(text.read().text).toBe('Titleka')
    expect(fillAt(text, 5)).toEqual([WHITE])
    expect(fillAt(text, 6)).toEqual([WHITE])
  })
})
