import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

describe('variable mode undo', () => {
  test('setting a default mode lists it first, and undo restores the order', () => {
    const editor = createEditor()
    editor.graph.addCollection({
      id: 'theme',
      name: 'Theme',
      modes: [
        { modeId: 'light', name: 'Light' },
        { modeId: 'dim', name: 'Dim' },
        { modeId: 'dark', name: 'Dark' }
      ],
      defaultModeId: 'light',
      variableIds: []
    })
    const collection = () => editor.graph.variableCollections.get('theme')
    // Without sort positions the array is the order: the new default moves first in it,
    // and undo puts the order back. (A collection with positions keeps its array; the
    // scene-graph variables test pins that case.)
    const order = () => collection()?.modes.map((m) => m.modeId)

    editor.setDefaultMode('theme', 'dark')
    expect(order()).toEqual(['dark', 'light', 'dim'])
    expect(collection()?.defaultModeId).toBe('dark')

    editor.undo.undo()
    expect(order()).toEqual(['light', 'dim', 'dark'])
    expect(collection()?.defaultModeId).toBe('light')

    editor.undo.redo()
    expect(order()).toEqual(['dark', 'light', 'dim'])
  })

  test('undo restores the default mode of a collection restored by an earlier undo', () => {
    const editor = createEditor()
    editor.graph.addCollection({
      id: 'theme',
      name: 'Theme',
      modes: [
        { modeId: 'light', name: 'Light' },
        { modeId: 'dark', name: 'Dark' }
      ],
      defaultModeId: 'light',
      variableIds: []
    })
    editor.setDefaultMode('theme', 'dark')
    editor.removeCollection('theme')

    // Undoing the removal restores a copy of the collection, not the object it had before.
    editor.undo.undo()
    editor.undo.undo()

    const restored = editor.graph.variableCollections.get('theme')
    expect(restored?.defaultModeId).toBe('light')
    expect(restored?.modes.map((m) => m.modeId)).toEqual(['light', 'dark'])
  })
})
