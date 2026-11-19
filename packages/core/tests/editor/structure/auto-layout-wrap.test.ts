import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import type { Vector } from '@pairdraw/scene-graph/primitives'

function editorWithRectangles(positions: Vector[]) {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const ids = positions.map((position, index) =>
    editor.graph.createNode('RECTANGLE', pageId, {
      name: `Rect ${index + 1}`,
      x: position.x,
      y: position.y,
      width: 50,
      height: 40
    }).id
  )
  editor.select(ids)
  return { editor, ids }
}

describe('wrapping layers in auto layout', () => {
  test('takes the gap a row of layers already has', () => {
    const { editor, ids } = editorWithRectangles([
      { x: 450, y: 0 },
      { x: 520, y: 0 },
      { x: 590, y: 0 }
    ])

    const frameId = editor.wrapInAutoLayout()
    const frame = editor.graph.getNode(frameId ?? '')

    expect(frame?.layoutMode).toBe('HORIZONTAL')
    expect(frame?.itemSpacing).toBe(20)
    // The layers stay where they were: the gap is the one they had.
    expect(ids.map((id) => editor.graph.getNode(id)?.x)).toEqual([0, 70, 140])
  })

  test('takes the gap a column of layers already has', () => {
    const { editor, ids } = editorWithRectangles([
      { x: 0, y: 0 },
      { x: 0, y: 52 },
      { x: 0, y: 104 }
    ])

    const frameId = editor.wrapInAutoLayout()
    const frame = editor.graph.getNode(frameId ?? '')

    expect(frame?.layoutMode).toBe('VERTICAL')
    expect(frame?.itemSpacing).toBe(12)
    expect(ids.map((id) => editor.graph.getNode(id)?.y)).toEqual([0, 52, 104])
  })

  test('rounds an uneven gap and keeps the layers close to where they were', () => {
    const { editor } = editorWithRectangles([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 150, y: 0 }
    ])

    const frameId = editor.wrapInAutoLayout()
    const frame = editor.graph.getNode(frameId ?? '')

    // Gaps of 10 and 40 give the middle one, and the frame hugs it.
    expect(frame?.itemSpacing).toBe(25)
    expect(frame?.width).toBe(200)
  })
})
