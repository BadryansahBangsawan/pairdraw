import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'
import {
  addDesignDecision,
  allowDesignValue,
  createDesignMemory
} from '@pairdraw/scene-graph/design-memory'

let editor: Editor

afterEach(() => editor.dispose())

describe('design memory in the editor', () => {
  test('is replaced as one undo step and removed with null', () => {
    editor = createEditor()
    expect(editor.designMemory()).toBeNull()
    const memory = addDesignDecision(createDesignMemory(), 'Use 8 px steps.', 'person')
    editor.setDesignMemory(memory)
    expect(editor.designMemory()).toEqual(memory)

    const allowed = allowDesignValue(memory, 'colors', '#FF00AA')
    editor.setDesignMemory(allowed, 'Allow #FF00AA')
    expect(editor.designMemory()?.colors.values).toEqual(['#FF00AA'])
    editor.undo.undo()
    expect(editor.designMemory()).toEqual(memory)
    editor.undo.redo()
    expect(editor.designMemory()?.colors.values).toEqual(['#FF00AA'])

    editor.setDesignMemory(null)
    expect(editor.designMemory()).toBeNull()
    editor.undo.undo()
    expect(editor.designMemory()?.colors.values).toEqual(['#FF00AA'])
  })

  test('a read-only document is read but not changed', () => {
    editor = createEditor()
    editor.setDesignMemory(createDesignMemory())
    editor.setReadOnly(true)
    expect(editor.designMemory()).not.toBeNull()
    expect(() => editor.setDesignMemory(null)).toThrow()
    expect(editor.designMemory()).not.toBeNull()
  })
})
