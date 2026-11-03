import { afterEach, describe, expect, mock, test } from 'bun:test'

import { createEditor, type Editor } from '@open-pencil/core'

import { updateHoverCursor } from '#vue/shared/input/select'
import type { DragState } from '#vue/shared/input/types'
import { getNodeEditState, handleNodeEditDown } from '#vue/shared/input/vector'
import { handleNodeEditTransformMove } from '#vue/shared/input/vector/transform'

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

const hitFns = {
  hitTestInScope: () => null,
  hitTestFrameTitle: () => null,
  hitTestSectionTitle: () => null,
  hitTestComponentLabel: () => null
}

describe('bending a segment', () => {
  test('a ⌘/Ctrl press on a segment selects it and starts a bend from where it was pressed', () => {
    const nodeEditPushHistory = mock()
    const es = setup({ nodeEditPushHistory })
    es.selectedVertexIndices = new Set([2])
    const drag = press(50, 2, { metaKey: true })
    if (drag?.type !== 'bend-segment') throw new Error('expected a bend')
    expect(drag.segmentIndex).toBe(0)
    expect(drag.t).toBeCloseTo(0.5, 6)
    expect(drag.origin.vertices).toHaveLength(3)
    expect([...es.selectedSegmentIndices]).toEqual([0])
    expect(es.selectedVertexIndices.size).toBe(0)
    expect(nodeEditPushHistory).toHaveBeenCalledTimes(1)
  })

  test('Ctrl bends as ⌘ does, and a plain press still drags the segment', () => {
    setup()
    expect(press(50, 0, { ctrlKey: true })?.type).toBe('bend-segment')
    expect(press(50, 0)?.type).toBe('edit-node')
  })

  test('a move bends by how far the pointer went, keeping the neighbours with ⌥/Alt', () => {
    const nodeEditBendSegment = mock()
    setup({ nodeEditBendSegment })
    const drag = press(50, 0, { metaKey: true })
    if (drag?.type !== 'bend-segment') throw new Error('expected a bend')
    handleNodeEditTransformMove(drag, 60, 40, { altKey: false, shiftKey: false }, editor)
    handleNodeEditTransformMove(drag, 60, 40, { altKey: true, shiftKey: false }, editor)
    expect(nodeEditBendSegment.mock.calls).toEqual([
      [drag.origin, 0, drag.t, { x: 10, y: 40 }, false],
      [drag.origin, 0, drag.t, { x: 10, y: 40 }, true]
    ])
  })
})

describe('the transform box around selected points', () => {
  /** Points 0 and 2 selected: the box runs from (0, 0) to (100, 100). */
  function selectCorners() {
    const es = setup({ nodeEditScalePoints: mock(), nodeEditRotatePoints: mock() })
    es.selectedVertexIndices = new Set([0, 2])
    return es
  }

  test('a lone point has no box', () => {
    const es = setup()
    es.selectedVertexIndices = new Set([0])
    expect(press(0, 100)?.type).toBe('edit-marquee')
  })

  test('a corner scales and just outside it turns the points', () => {
    selectCorners()
    const corner = press(0, 100)
    if (corner?.type !== 'edit-transform') throw new Error('expected a transform')
    expect(corner.zone).toEqual({ kind: 'resize', handle: 'sw' })
    expect(corner.points.sort()).toEqual([0, 2])
    expect(corner.box).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(press(-8, 108)).toMatchObject({ zone: { kind: 'rotate', corner: 'sw' } })
  })

  test('an edge scales, but a segment along it is still dragged and points win over corners', () => {
    selectCorners()
    expect(press(-3, 50)).toMatchObject({ zone: { kind: 'resize', handle: 'w' } })
    expect(press(100, 50)?.type).toBe('edit-node')
    expect(press(100, 0)?.type).toBe('edit-node')
  })

  test('a segment leaving a corner of the box is dragged, not the rotate zone it crosses', () => {
    const es = selectCorners()
    es.vertices.push({ x: 130, y: 130 })
    es.segments.push({ start: 2, end: 3, tangentStart: zero, tangentEnd: zero })
    expect(press(114, 101)).toMatchObject({ zone: { kind: 'rotate', corner: 'se' } })
    expect(press(110, 110)?.type).toBe('edit-node')
    expect([...es.selectedSegmentIndices]).toEqual([2])
  })

  test('⌘/Ctrl leaves the box alone', () => {
    selectCorners()
    expect(press(0, 100, { metaKey: true })?.type).toBe('edit-marquee')
  })

  test('tools other than Select have no box', () => {
    selectCorners()
    editor.setTool('PEN')
    expect(getNodeEditState(editor)).not.toBeNull()
    expect(updateHoverCursor(0, 100, editor, hitFns)).toBeNull()
    expect(press(0, 100)?.type).not.toBe('edit-transform')
  })

  test('the pointer shows a resize or rotate cursor over the box, but not with ⌘/Ctrl held', () => {
    selectCorners()
    expect(updateHoverCursor(0, 100, editor, hitFns)).toContain('url(')
    expect(updateHoverCursor(-8, 108, editor, hitFns)).toContain('url(')
    expect(updateHoverCursor(50, 50, editor, hitFns)).toBeNull()
    expect(updateHoverCursor(0, 100, editor, hitFns, true)).toBeNull()
    expect(updateHoverCursor(-8, 108, editor, hitFns, true)).toBeNull()
  })

  test('a move scales from the handle, Shift keeping proportions and ⌥/Alt from the centre', () => {
    const nodeEditScalePoints = mock()
    setup({ nodeEditScalePoints })
    expectEditState().selectedVertexIndices = new Set([0, 2])
    const drag = press(0, 100)
    if (drag?.type !== 'edit-transform') throw new Error('expected a transform')
    handleNodeEditTransformMove(drag, -20, 130, { altKey: true, shiftKey: true }, editor)
    expect(nodeEditScalePoints).toHaveBeenCalledWith(
      drag.origin,
      drag.points,
      drag.box,
      'sw',
      { x: -20, y: 30 },
      { uniform: true, fromCenter: true }
    )
  })

  test('a move outside a corner turns the points, Shift in steps', () => {
    const nodeEditRotatePoints = mock()
    setup({ nodeEditRotatePoints })
    expectEditState().selectedVertexIndices = new Set([0, 2])
    const drag = press(-8, 108)
    if (drag?.type !== 'edit-transform') throw new Error('expected a transform')
    handleNodeEditTransformMove(drag, -30, 50, { altKey: false, shiftKey: true }, editor)
    expect(nodeEditRotatePoints).toHaveBeenCalledWith(
      drag.origin,
      drag.points,
      drag.box,
      { x: -8, y: 108 },
      { x: -30, y: 50 },
      true
    )
  })
})

function expectEditState() {
  const es = getNodeEditState(editor)
  if (!es) throw new Error('expected edit state')
  return es
}
