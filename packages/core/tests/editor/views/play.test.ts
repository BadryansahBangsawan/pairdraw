import { describe, expect, test } from 'bun:test'

import { createEditor, resolveEditorProfile } from '@pairdraw/core'

const SCREEN = { width: 1000, height: 500 }

function viewOf(editor: ReturnType<typeof createEditor>) {
  const { panX, panY, zoom } = editor.state
  return { panX, panY, zoom }
}

describe('previewing the design', () => {
  test('leaving a preview returns the editor to the view it had', () => {
    const editor = createEditor({ getViewportSize: () => SCREEN })
    editor.zoomToLevel(0.52)
    editor.centerOn(420, 260, 0.52)
    const before = viewOf(editor)

    editor.startPlay()
    expect(resolveEditorProfile(editor.state).pointer).toBe('pan')
    // Starting preview fits the played frame, as the canvas stage does.
    editor.zoomToArea(0, 0, 350, 200)
    expect(viewOf(editor)).not.toEqual(before)

    editor.stopPlay()
    expect(viewOf(editor)).toEqual(before)
    expect(resolveEditorProfile(editor.state).pointer).toBe('tools')
  })

  test('restarting a preview keeps the view it will return to', () => {
    const editor = createEditor({ getViewportSize: () => SCREEN })
    editor.zoomToLevel(0.75)
    editor.centerOn(300, 180, 0.75)
    const before = viewOf(editor)

    editor.startPlay()
    editor.zoomToArea(0, 0, 120, 80)
    editor.resetPlay()
    editor.zoomToArea(0, 0, 400, 240)

    editor.stopPlay()
    expect(viewOf(editor)).toEqual(before)
  })
})
