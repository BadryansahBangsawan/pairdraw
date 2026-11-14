import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'

import { startZoomDrag, ZOOM_TOOL_STEP, zoomToolCursor } from '#vue/canvas/zoom/input'

const VIEWPORT = { width: 800, height: 600 }

let editor: Editor

beforeEach(() => {
  editor = createEditor({ getViewportSize: () => VIEWPORT })
  editor.state.panX = 40
  editor.state.panY = 20
})

afterEach(() => editor.dispose())

/** The world point under a screen point. */
function under(sx: number, sy: number) {
  return editor.screenToCanvas(sx, sy)
}

/** A press at a screen point, with its canvas point. */
function press(sx: number, sy: number, altKey = false) {
  const { x, y } = under(sx, sy)
  return startZoomDrag(x, y, sx, sy, altKey, editor)
}

describe('zoom tool', () => {
  test('a click zooms in on the pointer, keeping the point under it', () => {
    const before = under(300, 200)
    press(300, 200).commit()
    expect(editor.state.zoom).toBe(ZOOM_TOOL_STEP)
    expect(under(300, 200)).toEqual(before)
  })

  test('an ⌥ click zooms out on the pointer', () => {
    const before = under(300, 200)
    press(300, 200, true).commit()
    expect(editor.state.zoom).toBe(1 / ZOOM_TOOL_STEP)
    expect(under(300, 200)).toEqual(before)
  })

  test('⌥ pressed before the release zooms out too', () => {
    const drag = press(300, 200)
    const { x, y } = under(301, 200)
    drag.update(x, y, 301, 200, true)
    drag.commit()
    expect(editor.state.zoom).toBe(1 / ZOOM_TOOL_STEP)
  })

  test('a drag frames an area and the release zooms to fit it', () => {
    const drag = press(100, 100)
    const end = under(300, 200)
    drag.update(end.x, end.y, 300, 200, false)
    const area = editor.state.marquee
    expect(area).toEqual({ ...under(100, 100), width: 200, height: 100 })

    drag.commit()

    expect(editor.state.marquee).toBeNull()
    expect(editor.state.zoom).toBe(4)
    const center = under(VIEWPORT.width / 2, VIEWPORT.height / 2)
    expect(center).toEqual({ x: 160, y: 130 })
  })

  test('a move within the drag threshold is still a click', () => {
    const drag = press(300, 200)
    const { x, y } = under(301, 201)
    drag.update(x, y, 301, 201, false)
    expect(editor.state.marquee).toBeNull()
  })

  test('cancelling takes the frame away and leaves the view', () => {
    const drag = press(100, 100)
    const end = under(300, 200)
    drag.update(end.x, end.y, 300, 200, false)
    drag.cancel()
    expect(editor.state.marquee).toBeNull()
    expect(editor.state.zoom).toBe(1)
  })

  test('the cursor is a magnifier that zooms out with ⌥', () => {
    expect([zoomToolCursor(false), zoomToolCursor(true)]).toEqual(['zoom-in', 'zoom-out'])
  })
})
