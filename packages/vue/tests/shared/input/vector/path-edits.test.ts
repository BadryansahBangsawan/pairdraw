import { afterEach, describe, expect, mock, test } from 'bun:test'

import { createEditor, type Editor } from '@open-pencil/core'

import { updateHoverCursor } from '#vue/shared/input/select'
import type { DragState } from '#vue/shared/input/types'
import { getNodeEditState, handleNodeEditDown, handleNodeEditMove } from '#vue/shared/input/vector'
import { CUT_CURSOR } from '#vue/shared/input/vector/cursor'

let editor: Editor

afterEach(() => editor.dispose())

const zero = { x: 0, y: 0 }

/** An open path (0,0) → (100,0) → (100,100) in edit mode, with the given editor methods. */
function setup(methods: Record<string, unknown> = {}) {
  editor = createEditor()
  Object.assign(editor, { nodeEditPushHistory: mock(), exitNodeEditMode: mock(), ...methods })
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
  return expectState()
}

function expectState() {
  const es = getNodeEditState(editor)
  if (!es) throw new Error('expected edit state')
  return es
}

function press(cx: number, cy: number, modifiers: Partial<MouseEvent> = {}) {
  const started: { drag: DragState | null } = { drag: null }
  handleNodeEditDown(
    { shiftKey: false, button: 0, ...modifiers } as MouseEvent,
    cx,
    cy,
    editor,
    (d) => {
      started.drag = d
    }
  )
  return started.drag
}

describe('the cut tool', () => {
  test('a press cuts where it lands and starts no drag', () => {
    const nodeEditCutAt = mock(() => true)
    const es = setup({ nodeEditCutAt })
    es.cutTool = true
    expect(press(50, 0)).toBeNull()
    expect(nodeEditCutAt).toHaveBeenCalledWith(50, 0)
  })

  test('a right-click, which opens the context menu, cuts nothing', () => {
    const nodeEditCutAt = mock(() => true)
    const es = setup({ nodeEditCutAt })
    es.cutTool = true
    expect(press(50, 0, { button: 2 })).toBeNull()
    expect(nodeEditCutAt).not.toHaveBeenCalled()
  })

  test('the pointer shows scissors over the canvas', () => {
    const es = setup()
    const hitFns = {
      hitTestInScope: () => null,
      hitTestFrameTitle: () => null,
      hitTestSectionTitle: () => null,
      hitTestComponentLabel: () => null
    }
    expect(updateHoverCursor(50, 50, editor, hitFns)).toBeNull()
    es.cutTool = true
    expect(updateHoverCursor(50, 50, editor, hitFns)).toBe(CUT_CURSOR)
  })
})

describe('⌥/Alt dragging points', () => {
  test('copies the selection once the drag starts and moves the copies', () => {
    const nodeEditDuplicateSelection = mock(() => {
      const es = expectState()
      es.vertices.push({ x: 100, y: 0 })
      es.selectedVertexIndices = new Set([3])
      return new Map([[1, 3]])
    })
    setup({ nodeEditDuplicateSelection })
    const drag = press(100, 0, { altKey: true })
    if (drag?.type !== 'edit-node') throw new Error('expected a point drag')
    expect(drag.duplicate).toBe(true)

    // Within the drag threshold nothing is copied or moved.
    handleNodeEditMove(drag, 101, 0, editor, false, false, false, true)
    expect(nodeEditDuplicateSelection).not.toHaveBeenCalled()
    expect(expectState().vertices[1]).toEqual({ x: 100, y: 0 })

    handleNodeEditMove(drag, 130, 20, editor, false, false, false, true)
    expect(nodeEditDuplicateSelection).toHaveBeenCalledTimes(1)
    expect(expectState().vertices[1]).toEqual({ x: 100, y: 0 })
    expect(expectState().vertices[3]).toMatchObject({ x: 130, y: 20 })

    handleNodeEditMove(drag, 140, 20, editor, false, false, false, true)
    expect(nodeEditDuplicateSelection).toHaveBeenCalledTimes(1)
    expect(expectState().vertices[3]).toMatchObject({ x: 140, y: 20 })
  })

  test('a drag without ⌥/Alt moves the points themselves', () => {
    const nodeEditDuplicateSelection = mock(() => null)
    setup({ nodeEditDuplicateSelection })
    const drag = press(100, 0)
    if (drag?.type !== 'edit-node') throw new Error('expected a point drag')
    handleNodeEditMove(drag, 130, 20, editor, false, false, false, true)
    expect(nodeEditDuplicateSelection).not.toHaveBeenCalled()
    expect(expectState().vertices[1]).toMatchObject({ x: 130, y: 20 })
  })
})
