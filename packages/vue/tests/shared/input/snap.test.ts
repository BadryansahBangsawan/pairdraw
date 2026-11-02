import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'

import { gridRounding, resolveObjectPixelSnap, snapGridStep } from '#vue/shared/input/snap'

function editorSnapping(halfPixel: boolean) {
  const editor = createEditor()
  editor.state.snappingPreferences = { geometry: false, objects: false, pixelGrid: true, halfPixel }
  return editor
}

describe('half-pixel snapping', () => {
  test('a design snaps to whole pixels unless half pixels are on', () => {
    expect(snapGridStep(editorSnapping(false))).toBe(1)
    expect(snapGridStep(editorSnapping(true))).toBe(0.5)
  })

  test('a board keeps its 16-unit grid with half pixels on', () => {
    const editor = editorSnapping(true)
    editor.setDocumentKind('board')
    expect(snapGridStep(editor)).toBe(16)
  })

  test('a move ends on the nearest half pixel', () => {
    const result = resolveObjectPixelSnap(
      new Set(['frame']),
      { x: 10.3, y: 20.8, width: 100, height: 80 },
      [],
      editorSnapping(true)
    )
    expect(result.correction.x).toBeCloseTo(0.2)
    expect(result.correction.y).toBeCloseTo(0.2)
  })

  test('drawn corners land on half pixels', () => {
    const round = gridRounding(editorSnapping(true))
    expect(round(4.3)).toBe(4.5)
    expect(round(4.2)).toBe(4)
  })

  test('half pixels do nothing while Snap to pixel grid is off', () => {
    const editor = editorSnapping(true)
    editor.state.snappingPreferences.pixelGrid = false
    expect(gridRounding(editor)(4.3)).toBe(4.3)
  })
})
