import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

const VIEWPORT = { width: 800, height: 600 }

/** The world point at the center of the viewport. */
function center(editor: ReturnType<typeof createEditor>) {
  const { panX, panY, zoom } = editor.state
  return { x: (VIEWPORT.width / 2 - panX) / zoom, y: (VIEWPORT.height / 2 - panY) / zoom }
}

describe('zoomToLevel', () => {
  test.each([0.5, 1, 4])('keeps the centered point in place when zooming from 2 to %p', (level) => {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })
    editor.state.zoom = 2
    editor.state.panX = -300
    editor.state.panY = 120
    const before = center(editor)

    editor.zoomToLevel(level)

    expect(editor.state.zoom).toBe(level)
    expect(center(editor)).toEqual(before)
  })
})

describe('centerOn', () => {
  test('puts the point at the center at the given zoom', () => {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })
    editor.centerOn(300, 200, 2)
    expect(editor.state.zoom).toBe(2)
    expect(center(editor)).toEqual({ x: 300, y: 200 })
  })

  test('leaves the view alone for a point too far away to represent', () => {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })
    const before = { ...center(editor), zoom: editor.state.zoom }
    editor.centerOn(1e308, 0, 256)
    expect({ ...center(editor), zoom: editor.state.zoom }).toEqual(before)
  })
})

describe('zoomToArea', () => {
  test('fits the area edge to edge, past 100%, centered in the viewport', () => {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })

    editor.zoomToArea(100, 100, 200, 150)

    expect(editor.state.zoom).toBe(8)
    expect(center(editor)).toEqual({ x: 150, y: 125 })
  })

  test('leaves the view alone for an area with no width or height', () => {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })
    const before = { ...center(editor), zoom: editor.state.zoom }

    editor.zoomToArea(100, 100, 100, 300)

    expect({ ...center(editor), zoom: editor.state.zoom }).toEqual(before)
  })
})

describe('zoomToBounds', () => {
  test('stops at the smallest zoom for content too large to fit, still centered', () => {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })

    editor.zoomToBounds(0, 0, 100_000, 50_000)

    expect(editor.state.zoom).toBe(0.02)
    const { x, y } = center(editor)
    expect(x).toBeCloseTo(50_000)
    expect(y).toBeCloseTo(25_000)
  })
})

/** Floating chrome over the canvas: a tool rail on the left, a pill at the bottom. */
const INSETS = { top: 0, right: 0, bottom: 40, left: 60 }

/** The visible canvas the chrome leaves, in screen pixels. */
const AREA = { left: 60, top: 0, width: VIEWPORT.width - 60, height: VIEWPORT.height - 40 }

describe('the canvas floating chrome leaves', () => {
  test('zoomToBounds centres content in it, clear of the tool rail', () => {
    const editor = createEditor({
      getViewportSize: () => VIEWPORT,
      getViewportInsets: () => INSETS
    })

    editor.zoomToBounds(100, 100, 300, 200)

    const { panX, panY, zoom } = editor.state
    expect(zoom).toBe(1)
    expect(panX + 100 * zoom).toBe(AREA.left + (AREA.width - 200 * zoom) / 2)
    expect(panY + 100 * zoom).toBe(AREA.top + (AREA.height - 100 * zoom) / 2)
  })

  test('zoomToArea fills it and centres on its middle', () => {
    const editor = createEditor({
      getViewportSize: () => VIEWPORT,
      getViewportInsets: () => INSETS
    })

    editor.zoomToArea(0, 0, 100, 100)

    expect(editor.state.zoom).toBe(5.6)
    const { panX, panY, zoom } = editor.state
    expect(panX + 50 * zoom).toBeCloseTo(AREA.left + AREA.width / 2)
    expect(panY + 50 * zoom).toBeCloseTo(AREA.top + AREA.height / 2)
  })

  test('centerOn puts the point at the middle of the visible canvas', () => {
    const editor = createEditor({
      getViewportSize: () => VIEWPORT,
      getViewportInsets: () => INSETS
    })

    editor.centerOn(300, 200, 2)

    const { panX, panY, zoom } = editor.state
    expect(panX + 300 * zoom).toBe(AREA.left + AREA.width / 2)
    expect(panY + 200 * zoom).toBe(AREA.top + AREA.height / 2)
  })

  test('zoomToLevel keeps the visible middle where it was', () => {
    const editor = createEditor({
      getViewportSize: () => VIEWPORT,
      getViewportInsets: () => INSETS
    })
    editor.state.zoom = 2
    editor.state.panX = -300
    editor.state.panY = 120
    const before = {
      x: (AREA.left + AREA.width / 2 - editor.state.panX) / editor.state.zoom,
      y: (AREA.top + AREA.height / 2 - editor.state.panY) / editor.state.zoom
    }

    editor.zoomToLevel(0.5)

    const { panX, panY, zoom } = editor.state
    expect(panX + before.x * zoom).toBeCloseTo(AREA.left + AREA.width / 2)
    expect(panY + before.y * zoom).toBeCloseTo(AREA.top + AREA.height / 2)
  })

  test('chrome that covers the whole canvas leaves the full viewport', () => {
    const editor = createEditor({
      getViewportSize: () => VIEWPORT,
      getViewportInsets: () => ({ top: 0, right: 400, bottom: 0, left: 400 })
    })

    editor.centerOn(10, 10, 1)

    expect(editor.state.panX).toBe(VIEWPORT.width / 2 - 10)
  })
})
