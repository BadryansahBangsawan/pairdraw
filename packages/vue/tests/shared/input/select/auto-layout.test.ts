import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'

import { handleSelectDown, type HitTestFns } from '#vue/shared/input/select'
import type { DragState } from '#vue/shared/input/types'

let editor: Editor

afterEach(() => editor.dispose())

const fns: HitTestFns = {
  hitTestInScope: (cx, cy, deep) =>
    deep ? editor.graph.hitTestDeep(cx, cy, editor.state.currentPageId) : null,
  isInsideContainerBounds: (cx, cy, id) => editor.graph.isPointInNode(id, cx, cy),
  hitTestFrameTitle: () => null,
  hitTestSectionTitle: () => null,
  hitTestComponentLabel: () => null
}

function setup(fields: Record<string, number | string> = {}): SceneNode {
  editor = createEditor()
  const page = editor.state.currentPageId
  const frame = editor.graph.createNode('FRAME', page, {
    width: 200,
    height: 100,
    layoutMode: 'HORIZONTAL',
    paddingTop: 10,
    paddingRight: 20,
    paddingBottom: 30,
    paddingLeft: 40,
    itemSpacing: 20,
    ...fields
  })
  editor.graph.createNode('RECTANGLE', frame.id, { x: 40, y: 10, width: 40, height: 20 })
  editor.graph.createNode('RECTANGLE', frame.id, { x: 100, y: 10, width: 60, height: 20 })
  editor.select([frame.id])
  return frame
}

function press(
  cx: number,
  cy: number,
  keys: { altKey?: boolean; shiftKey?: boolean } = {}
): DragState | null {
  let drag: DragState | null = null
  handleSelectDown(
    {
      altKey: keys.altKey ?? false,
      shiftKey: keys.shiftKey ?? false,
      metaKey: false,
      ctrlKey: false
    } as MouseEvent,
    cx,
    cy,
    cx,
    cy,
    editor,
    fns,
    () => false,
    () => false,
    (next) => {
      drag = next
    }
  )
  return drag
}

describe('auto layout handles on the selection', () => {
  test('drags one padding side and commits one undoable step', () => {
    const frame = setup()
    const drag = press(20, 50)
    expect(drag?.type).toBe('auto-layout')
    if (drag?.type !== 'auto-layout') return
    drag.update(45, 50, false, false)
    drag.commit()
    expect(editor.graph.getNode(frame.id)?.paddingLeft).toBe(65)
    expect(editor.graph.getNode(frame.id)?.paddingRight).toBe(20)

    editor.undoAction()
    expect(editor.graph.getNode(frame.id)?.paddingLeft).toBe(40)
  })

  test('Alt sets both sides of the dragged axis and Alt+Shift all four', () => {
    const frame = setup()
    const drag = press(20, 50, { altKey: true })
    if (drag?.type !== 'auto-layout') throw new Error('Expected an auto layout drag')
    drag.update(25, 50, true, false)
    drag.commit()
    expect(editor.graph.getNode(frame.id)).toMatchObject({
      paddingTop: 10,
      paddingRight: 45,
      paddingBottom: 30,
      paddingLeft: 45
    })

    const second = setup()
    const all = press(20, 50, { altKey: true, shiftKey: true })
    if (all?.type !== 'auto-layout') throw new Error('Expected an auto layout drag')
    all.update(45, 50, true, true)
    all.commit()
    expect(editor.graph.getNode(second.id)).toMatchObject({
      paddingTop: 70,
      paddingRight: 70,
      paddingBottom: 70,
      paddingLeft: 70
    })
  })

  test('Shift alone nudges only the dragged side by the large nudge', () => {
    const frame = setup()
    const drag = press(20, 50, { shiftKey: true })
    if (drag?.type !== 'auto-layout') throw new Error('Expected an auto layout drag')
    drag.update(37, 50, false, true)
    drag.commit()
    expect(editor.graph.getNode(frame.id)?.paddingLeft).toBe(60)
    expect(editor.graph.getNode(frame.id)?.paddingRight).toBe(20)
  })

  test('drags the gap between children and rounds it with Shift', () => {
    const frame = setup()
    const drag = press(90, 40)
    if (drag?.type !== 'auto-layout') throw new Error('Expected an auto layout drag')
    drag.update(105, 40, false, false)
    expect(editor.graph.getNode(frame.id)?.itemSpacing).toBe(35)
    drag.update(105, 40, false, true)
    drag.commit()
    expect(editor.graph.getNode(frame.id)?.itemSpacing).toBe(40)
  })

  test('drags an instance’s padding as one undoable override', () => {
    const frame = setup()
    editor.graph.updateNode(frame.id, { type: 'INSTANCE' })
    const drag = press(20, 50)
    expect(drag?.type).toBe('auto-layout')
    if (drag?.type !== 'auto-layout') return
    drag.update(45, 50, false, false)
    drag.commit()
    expect(editor.graph.getNode(frame.id)?.paddingLeft).toBe(65)

    editor.undoAction()
    expect(editor.graph.getNode(frame.id)?.paddingLeft).toBe(40)
    expect(editor.graph.getNode(frame.id)?.type).toBe('INSTANCE')
  })

  test('does not start on a generated frame or outside the handles', () => {
    const generated = setup()
    editor.graph.updateNode(generated.id, { type: 'STICKY' })
    expect(press(20, 50)?.type).not.toBe('auto-layout')

    setup()
    expect(press(70, 40)?.type).not.toBe('auto-layout')
  })
})
