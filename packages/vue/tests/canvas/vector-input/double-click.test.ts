import { afterEach, describe, expect, mock, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'

import { handleNodeEditDoubleClick } from '#vue/canvas/vector-input/double-click'

let editor: Editor

afterEach(() => editor.dispose())

const zero = { x: 0, y: 0 }

/** An open path (0,0) → (100,0) → (100,100) in edit mode, with the given editor methods. */
function setup(methods: Record<string, unknown>) {
  editor = createEditor()
  Object.assign(editor, methods)
  editor.state.nodeEditState = {
    nodeId: 'path',
    vertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ],
    segments: [
      { start: 0, end: 1, tangentStart: zero, tangentEnd: zero },
      { start: 1, end: 2, tangentStart: zero, tangentEnd: zero }
    ],
    regions: [],
    selectedVertexIndices: new Set<number>(),
    selectedSegmentIndices: new Set<number>(),
    selectedHandles: new Set<number>(),
    hoveredHandleInfo: null
  }
}

describe('double-clicking the path', () => {
  test('a point switches between smooth and corner', () => {
    const nodeEditToggleVertexSmooth = mock()
    setup({ nodeEditToggleVertexSmooth })
    expect(handleNodeEditDoubleClick({ metaKey: false, ctrlKey: false }, 100, 0, editor)).toBe(true)
    expect(nodeEditToggleVertexSmooth).toHaveBeenCalledWith(1)
  })

  test('⌘/Ctrl on a segment straightens it, and a plain double-click leaves it', () => {
    const nodeEditStraightenSegment = mock()
    setup({ nodeEditStraightenSegment })
    handleNodeEditDoubleClick({ metaKey: false, ctrlKey: false }, 50, 0, editor)
    expect(nodeEditStraightenSegment).not.toHaveBeenCalled()
    handleNodeEditDoubleClick({ metaKey: false, ctrlKey: true }, 50, 0, editor)
    expect(nodeEditStraightenSegment).toHaveBeenCalledWith(0)
  })

  test('the pen keeps its own double-clicks', () => {
    const nodeEditToggleVertexSmooth = mock()
    setup({ nodeEditToggleVertexSmooth })
    editor.setTool('PEN')
    expect(handleNodeEditDoubleClick({ metaKey: false, ctrlKey: false }, 100, 0, editor)).toBe(true)
    expect(nodeEditToggleVertexSmooth).not.toHaveBeenCalled()
  })

  test('outside a path being edited it is left to the canvas', () => {
    editor = createEditor()
    expect(handleNodeEditDoubleClick({ metaKey: false, ctrlKey: false }, 0, 0, editor)).toBe(false)
  })
})
