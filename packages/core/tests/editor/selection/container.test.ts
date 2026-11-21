import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'

let editor: Editor

afterEach(() => editor.dispose())

/** A variant inside a component set inside a nested frame. */
function variantInNestedFrame() {
  editor = createEditor()
  const pageId = editor.state.currentPageId
  const inner = editor.graph.createNode('FRAME', pageId, { name: 'Inner', width: 400, height: 300 })
  const set = editor.graph.createNode('COMPONENT_SET', inner.id, {
    name: 'Set',
    width: 200,
    height: 100
  })
  const variant = editor.graph.createNode('COMPONENT', set.id, {
    name: 'Variant',
    width: 200,
    height: 100
  })
  const leaf = editor.graph.createNode('RECTANGLE', variant.id, { width: 40, height: 40 })
  return { inner, set, variant, leaf }
}

describe('enterContainerOf', () => {
  test('enters the direct parent of a nested layer, as a double-click reached it', () => {
    const { variant, leaf } = variantInNestedFrame()
    editor.enterContainerOf(leaf.id)
    expect(editor.state.enteredContainerId).toBe(variant.id)
  })

  test('never climbs past an open component set to a surrounding frame', () => {
    const { inner, variant } = variantInNestedFrame()
    editor.enterContainerOf(variant.id)
    expect(editor.state.enteredContainerId).toBeNull()
    // The old rule walked up to the nested frame, which is not what a canvas click enters.
    expect(editor.state.enteredContainerId).not.toBe(inner.id)
  })

  test('enters nothing for a layer directly in a top-level frame or a section', () => {
    editor = createEditor()
    const pageId = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', pageId, { width: 200, height: 200 })
    const inFrame = editor.graph.createNode('RECTANGLE', frame.id, { width: 20, height: 20 })
    editor.enterContainerOf(inFrame.id)
    expect(editor.state.enteredContainerId).toBeNull()

    const section = editor.graph.createNode('SECTION', pageId, { width: 300, height: 300 })
    const inSection = editor.graph.createNode('RECTANGLE', section.id, { width: 20, height: 20 })
    editor.enterContainerOf(inSection.id)
    expect(editor.state.enteredContainerId).toBeNull()
  })
})
