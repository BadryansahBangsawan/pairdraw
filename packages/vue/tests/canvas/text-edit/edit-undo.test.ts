import { afterEach, describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'

import { createEditor, type Editor } from '@pairdraw/core'
import { TextEditor } from '@pairdraw/core/text'

import { createTextEditActions } from '#vue/canvas/text-edit/editing'

let editor: Editor

afterEach(() => editor.dispose())

/**
 * A text edit as the canvas runs it: the session starts through the editor, so its in-edit
 * history is live, and a renderer-less TextEditor stands in for the canvas's own.
 */
function editText(text: string) {
  editor = createEditor()
  const node = editor.graph.createNode('TEXT', editor.state.currentPageId, { text })
  editor.startTextEditing(node.id)
  const canvasKitUnusedWithoutRenderer: CanvasKit = Object.create(null)
  const textEditor = new TextEditor(canvasKitUnusedWithoutRenderer)
  const store: Editor = Object.create(editor)
  Object.defineProperty(store, 'textEditor', { value: textEditor })
  textEditor.start(node)
  // startTextEditing captures the opening snapshot when a text editor is present; headless it
  // is attached after, so seed the same opening state here.
  const state = textEditor.state
  if (state) editor.captureInEditSnapshot(state)
  const read = () => editor.graph.getNode(node.id) ?? node
  return { read, store, textEditor, actions: createTextEditActions(store) }
}

describe('undo inside a text edit', () => {
  test('a committed input method composition is one undoable step', () => {
    const text = editText('ab')
    const state = text.textEditor.state
    if (state) state.cursor = 2

    text.actions.replaceComposedText('漢', text.read())
    text.actions.finishComposition()
    expect(text.read().text).toBe('ab漢')

    expect(editor.undoInEdit()).toBe(true)
    expect(text.read().text).toBe('ab')
    expect(editor.redoInEdit()).toBe(true)
    expect(text.read().text).toBe('ab漢')
  })

  test('typing after a composition undoes one step at a time', () => {
    const text = editText('ab')
    const state = text.textEditor.state
    if (state) state.cursor = 2

    text.actions.replaceComposedText('漢', text.read())
    text.actions.finishComposition()
    text.actions.insertText('c', text.read())
    expect(text.read().text).toBe('ab漢c')

    expect(editor.undoInEdit()).toBe(true)
    expect(text.read().text).toBe('ab漢')
    expect(editor.undoInEdit()).toBe(true)
    expect(text.read().text).toBe('ab')
  })

  test('an abandoned composition leaves the history as it was', () => {
    const text = editText('ab')
    const state = text.textEditor.state
    if (state) state.cursor = 2

    text.actions.replaceComposedText('漢', text.read())
    text.actions.restoreComposition(text.read())
    text.actions.finishComposition()
    expect(text.read().text).toBe('ab')

    expect(editor.undoInEdit()).toBe(false)
    expect(text.read().text).toBe('ab')
  })
})