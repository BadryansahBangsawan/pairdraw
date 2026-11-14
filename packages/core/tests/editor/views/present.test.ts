import { describe, expect, test } from 'bun:test'

import { createEditor, presentationViewport, resolveEditorProfile } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'

const SCREEN = { width: 1000, height: 500 }

/** The world point at the screen's center, as the presentation puts it. */
function screenCenter(editor: ReturnType<typeof createEditor>) {
  const { panX, panY, zoom } = editor.state
  return { x: (SCREEN.width / 2 - panX) / zoom, y: (SCREEN.height / 2 - panY) / zoom, zoom }
}

function deck() {
  const editor = createEditor({ getViewportSize: () => SCREEN })
  const pageId = editor.state.currentPageId
  const first = editor.graph.createNode('FRAME', pageId, { x: 0, y: 0, width: 400, height: 100 })
  const second = editor.graph.createNode('FRAME', pageId, {
    x: 600,
    y: 0,
    width: 400,
    height: 2000
  })
  editor.graph.createNode('RECTANGLE', pageId, { x: 0, y: 300, width: 10, height: 10 })
  const third = editor.graph.createNode('INSTANCE', pageId, {
    x: -800,
    y: 0,
    width: 100,
    height: 100
  })
  return { editor, first, second, third }
}

describe('presentation viewport', () => {
  test('fits the whole slide, centered, as large as the screen holds', () => {
    const slide = { x: 100, y: 50, width: 400, height: 100 }
    expect(presentationViewport(slide, SCREEN, 'fit')).toEqual({ x: 300, y: 100, zoom: 2.5 })
  })

  test('at 100% a long slide starts at its top and centers the axis that fits', () => {
    const slide = { x: 0, y: 0, width: 400, height: 2000 }
    expect(presentationViewport(slide, SCREEN, 'actual')).toEqual({ x: 200, y: 250, zoom: 1 })
  })

  test('at 100% scrolling stays inside the slide', () => {
    const slide = { x: 0, y: 0, width: 2000, height: 2000 }
    expect(presentationViewport(slide, SCREEN, 'actual', { x: 900, y: 1900 })).toEqual({
      x: 900,
      y: 1750,
      zoom: 1
    })
  })
})

describe('presenting slides', () => {
  test('slides are the visible top-level frames in layer order, bottom layer first', () => {
    const { editor, first, second, third } = deck()
    editor.graph.createNode('FRAME', editor.state.currentPageId, { visible: false })
    expect(editor.getSlides().map((slide) => slide.id)).toEqual([first.id, second.id, third.id])
  })

  test('presents from the first slide as a preview without panels', () => {
    const { editor, first } = deck()
    expect(editor.startPresentation()).toBe(true)
    expect(editor.getPresentation()).toEqual({
      slideId: first.id,
      index: 0,
      count: 3,
      scale: 'fit'
    })
    const profile = resolveEditorProfile(editor.state)
    expect([profile.pointer, profile.shortcuts, profile.panels, profile.editChrome]).toEqual([
      'pan',
      'view',
      false,
      false
    ])
    expect(profile.live).toEqual({ revision: 0 })
    expect(screenCenter(editor)).toEqual({ x: 200, y: 50, zoom: 2.5 })
  })

  test('starts from the slide holding the selection, or the slide asked for', () => {
    const { editor, second, third } = deck()
    const child = editor.graph.createNode('RECTANGLE', second.id, { width: 10, height: 10 })
    editor.select([child.id])
    editor.startPresentation()
    expect(editor.getPresentation()?.slideId).toBe(second.id)
    editor.stopPresentation()
    editor.startPresentation(third.id)
    expect(editor.getPresentation()?.slideId).toBe(third.id)
  })

  test('steps through slides in order and stops at either end', () => {
    const { editor, first, second, third } = deck()
    editor.startPresentation()
    expect(editor.presentPreviousSlide()).toBe(false)
    expect(editor.presentNextSlide()).toBe(true)
    expect(editor.getPresentation()?.slideId).toBe(second.id)
    expect(editor.presentNextSlide()).toBe(true)
    expect(editor.getPresentation()?.slideId).toBe(third.id)
    expect(editor.presentNextSlide()).toBe(false)
    expect(editor.getPresentation()?.slideId).toBe(third.id)
    editor.presentSlide(first.id)
    expect(editor.getPresentation()?.index).toBe(0)
  })

  test('at 100% a long slide scrolls within itself, then reports its end', () => {
    const { editor, second } = deck()
    editor.startPresentation(second.id)
    editor.setPresentationScale('actual')
    expect(screenCenter(editor)).toEqual({ x: 800, y: 250, zoom: 1 })
    expect(editor.scrollPresentation(0, 1000)).toBe(true)
    expect(screenCenter(editor).y).toBe(1250)
    expect(editor.scrollPresentation(0, 1000)).toBe(true)
    expect(screenCenter(editor).y).toBe(1750)
    expect(editor.scrollPresentation(0, 100)).toBe(false)
    editor.setPresentationScale('fit')
    expect(editor.scrollPresentation(0, 100)).toBe(false)
  })

  test('leaving by Escape or Stop returns the canvas to where it looked', () => {
    const { editor } = deck()
    editor.centerOn(-300, 400, 0.5)
    const before = screenCenter(editor)
    editor.startPresentation()
    editor.presentNextSlide()
    expect(editor.leaveCanvasView()).toBe(true)
    expect(editor.getPresentation()).toBeNull()
    expect(editor.state.canvasView).toEqual({ id: 'edit' })
    expect(screenCenter(editor)).toEqual(before)

    editor.togglePresentation()
    expect(editor.getPresentation()).not.toBeNull()
    editor.togglePresentation()
    expect(screenCenter(editor)).toEqual(before)
  })

  test('a full-screen presentation returns the smaller canvas to its own pan and zoom', () => {
    const screen = { ...SCREEN }
    const editor = createEditor({ getViewportSize: () => screen })
    editor.graph.createNode('FRAME', editor.state.currentPageId, { width: 1920, height: 1080 })
    editor.centerOn(100, 100, 0.25)
    const { panX, panY, zoom } = editor.state
    editor.startPresentation()
    screen.width = 1920
    screen.height = 1200
    editor.fitPresentation()
    expect(editor.state.zoom).toBe(1)
    screen.width = SCREEN.width
    screen.height = SCREEN.height
    editor.stopPresentation()
    expect([editor.state.panX, editor.state.panY, editor.state.zoom]).toEqual([panX, panY, zoom])
  })

  test('a page without slides has nothing to present', () => {
    const editor = createEditor({ getViewportSize: () => SCREEN })
    expect(editor.startPresentation()).toBe(false)
    expect(editor.getPresentation()).toBeNull()
  })

  test('a slide removed while shown ends the presentation on the next step', () => {
    const { editor, first } = deck()
    editor.startPresentation()
    editor.graph.deleteNode(first.id)
    expect(editor.getPresentation()).toBeNull()
    expect(editor.presentNextSlide()).toBe(false)
    expect(editor.state.canvasView).toEqual({ id: 'edit' })
  })

  test('another document ends the presentation', () => {
    const { editor } = deck()
    editor.startPresentation()
    editor.replaceGraph(new SceneGraph())
    expect(editor.state.canvasView).toEqual({ id: 'edit' })
  })

  test('a read-only document can still be presented', () => {
    const { editor, second } = deck()
    editor.setReadOnly(true)
    expect(editor.startPresentation()).toBe(true)
    expect(editor.presentNextSlide()).toBe(true)
    expect(editor.getPresentation()?.slideId).toBe(second.id)
    editor.stopPresentation()
    expect(editor.getPresentation()).toBeNull()
  })
})
