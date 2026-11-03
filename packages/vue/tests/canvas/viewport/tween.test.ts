import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@open-pencil/core'

import {
  animateViewport,
  easeViewport,
  interpolateViewport,
  isViewportTweening,
  setViewportMotion,
  stopViewportTween,
  VIEWPORT_TWEEN_MS,
  type ViewportFrame
} from '#vue/canvas/viewport/tween'

const VIEWPORT = { width: 800, height: 600 }

/** Animation frames the test runs by hand, at times it picks. */
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 1
let editor: Editor

function runFrame(at: number) {
  const pending = [...frames.entries()]
  frames.clear()
  for (const [, callback] of pending) callback(at)
}

function viewport(): ViewportFrame {
  const { panX, panY, zoom } = editor.state
  return { panX, panY, zoom }
}

/** The screen point of a world point in a view. */
function onScreen(frame: ViewportFrame, x: number, y: number) {
  return { x: x * frame.zoom + frame.panX, y: y * frame.zoom + frame.panY }
}

beforeEach(() => {
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(nextFrame, callback)
    return nextFrame++
  }
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id)
  }
  editor = createEditor({ getViewportSize: () => VIEWPORT })
})

afterEach(() => {
  stopViewportTween(editor)
  editor.dispose()
  frames.clear()
  Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
  Reflect.deleteProperty(globalThis, 'cancelAnimationFrame')
})

describe('interpolateViewport', () => {
  test('starts and lands exactly on the two views', () => {
    const from = { panX: 10, panY: 20, zoom: 1 }
    const to = { panX: -300, panY: 40, zoom: 4 }
    expect(interpolateViewport(from, to, 0)).toEqual(from)
    expect(interpolateViewport(from, to, 1)).toEqual(to)
  })

  test('zooms by equal ratios, keeping the point both views share in place', () => {
    const from = { panX: 0, panY: 0, zoom: 1 }
    // Zooming 4x about the screen point (200, 100).
    const to = { panX: 200 - 200 * 4, panY: 100 - 100 * 4, zoom: 4 }
    const halfway = interpolateViewport(from, to, 0.5)
    expect(halfway.zoom).toBeCloseTo(2, 9)
    const point = onScreen(halfway, 200, 100)
    expect(point.x).toBeCloseTo(200, 9)
    expect(point.y).toBeCloseTo(100, 9)
  })

  test('pans in a straight line when the zoom stays', () => {
    const from = { panX: 0, panY: 0, zoom: 2 }
    const to = { panX: 100, panY: -50, zoom: 2 }
    expect(interpolateViewport(from, to, 0.25)).toEqual({ panX: 25, panY: -12.5, zoom: 2 })
  })

  test('eases in and out', () => {
    expect([easeViewport(0), easeViewport(0.5), easeViewport(1)]).toEqual([0, 0.5, 1])
    expect(easeViewport(0.1)).toBeLessThan(0.1)
    expect(easeViewport(0.9)).toBeGreaterThan(0.9)
  })
})

describe('animateViewport', () => {
  test('lands at once where motion is off', () => {
    setViewportMotion(editor, () => false)
    animateViewport(editor, () => editor.zoomToLevel(2))
    expect(editor.state.zoom).toBe(2)
    expect(isViewportTweening(editor)).toBe(false)
  })

  test('glides from the old view to the new one, which listeners hear of at once', () => {
    setViewportMotion(editor, () => true)
    const heard: number[] = []
    editor.onEditorEvent('viewport:changed', (next) => heard.push(next.zoom))
    const start = performance.now()

    animateViewport(editor, () => editor.zoomToLevel(4))

    expect(heard).toEqual([4])
    expect(editor.state.zoom).toBe(1)
    runFrame(start + VIEWPORT_TWEEN_MS / 2)
    expect(editor.state.zoom).toBeGreaterThan(1)
    expect(editor.state.zoom).toBeLessThan(4)
    runFrame(start + VIEWPORT_TWEEN_MS + 1)
    expect(editor.state.zoom).toBe(4)
    expect(isViewportTweening(editor)).toBe(false)
  })

  test('a viewport change from elsewhere stops the glide where it is', () => {
    setViewportMotion(editor, () => true)
    const start = performance.now()
    animateViewport(editor, () => editor.zoomToLevel(4))
    runFrame(start + VIEWPORT_TWEEN_MS / 2)

    editor.pan(10, 0)
    const after = viewport()
    runFrame(start + VIEWPORT_TWEEN_MS + 1)

    expect(isViewportTweening(editor)).toBe(false)
    expect(viewport()).toEqual(after)
    expect(after.zoom).toBeLessThan(4)
  })

  test('the next change starts from where the last one was going', () => {
    setViewportMotion(editor, () => true)
    animateViewport(editor, () => editor.zoomToLevel(2))
    animateViewport(editor, () => editor.zoomToLevel(editor.state.zoom * 2))
    runFrame(performance.now() + VIEWPORT_TWEEN_MS + 1)
    expect(editor.state.zoom).toBe(4)
  })

  test('a press stops the glide where it is', () => {
    setViewportMotion(editor, () => true)
    const start = performance.now()
    animateViewport(editor, () => editor.zoomToLevel(4))
    runFrame(start + VIEWPORT_TWEEN_MS / 2)
    const halfway = viewport()

    stopViewportTween(editor)
    runFrame(start + VIEWPORT_TWEEN_MS + 1)

    expect(viewport()).toEqual(halfway)
  })

  test('leaving the page mid-glide saves its view where the glide was going', async () => {
    setViewportMotion(editor, () => true)
    const first = editor.state.currentPageId
    const second = editor.addPage()
    const start = performance.now()
    animateViewport(editor, () => editor.zoomToLevel(4))
    runFrame(start + VIEWPORT_TWEEN_MS / 2)
    expect(editor.state.zoom).toBeLessThan(4)

    await editor.switchPage(second)
    expect(isViewportTweening(editor)).toBe(false)
    await editor.switchPage(first)

    expect(editor.state.zoom).toBe(4)
  })
})
