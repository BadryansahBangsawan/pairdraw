import { describe, expect, test } from 'bun:test'

import { createEditor, pageSlides, slideMoveTarget } from '@pairdraw/core'
import { withIcon } from '@pairdraw/scene-graph/icons'

const VIEWPORT = { width: 800, height: 600 }

describe('slides', () => {
  test('an icon frame is not a slide, also when it sits in a section', () => {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })
    const pageId = editor.state.currentPageId
    const home = editor.graph.createNode('FRAME', pageId, {
      name: 'Home',
      width: 1440,
      height: 900
    })
    expect(home.parentId).toBe(pageId)
    const icon = editor.graph.createNode('FRAME', pageId, {
      name: 'home',
      width: 24,
      height: 24
    })
    editor.graph.updateNode(icon.id, {
      pluginData: withIcon(icon, { name: 'material-symbols:home' })
    })
    const section = editor.graph.createNode('SECTION', pageId, { x: 2000, y: 0, width: 300 })
    const inSection = editor.graph.createNode('FRAME', section.id, {
      name: 'details',
      width: 24,
      height: 24
    })
    editor.graph.updateNode(inSection.id, {
      pluginData: withIcon(inSection, { name: 'material-symbols:details' })
    })
    editor.graph.createNode('FRAME', pageId, { name: 'Pricing', width: 1440, height: 900 })

    expect(pageSlides(editor.graph, pageId).map((node) => node.name)).toEqual([
      'Home',
      'Pricing'
    ])
    expect(pageSlides(editor.graph, pageId).map((node) => node.id)).not.toContain(icon.id)
  })
})

// Figma's N and Shift+N.
describe('frame navigation', () => {
  function frames() {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })
    const pageId = editor.state.currentPageId
    const right = editor.graph.createNode('FRAME', pageId, {
      x: 600,
      y: 0,
      width: 100,
      height: 100
    })
    const left = editor.graph.createNode('FRAME', pageId, { x: 0, y: 0, width: 100, height: 100 })
    const section = editor.graph.createNode('SECTION', pageId, { x: 200, y: 0, width: 300 })
    const inSection = editor.graph.createNode('COMPONENT', section.id, {
      x: 100,
      y: 0,
      width: 100,
      height: 100
    })
    editor.graph.createNode('RECTANGLE', pageId, { x: 100, y: 0, width: 10, height: 10 })
    editor.graph.createNode('FRAME', pageId, { x: 50, y: 0, visible: false })
    return { editor, left, inSection, right }
  }

  test('steps through visible top-level frames left to right, into sections, and wraps', () => {
    const { editor, left, inSection, right } = frames()

    editor.zoomToNextFrame()
    expect(editor.state.selectedIds).toEqual(new Set([left.id]))
    editor.zoomToNextFrame()
    expect(editor.state.selectedIds).toEqual(new Set([inSection.id]))
    editor.zoomToNextFrame()
    expect(editor.state.selectedIds).toEqual(new Set([right.id]))
    editor.zoomToNextFrame()
    expect(editor.state.selectedIds).toEqual(new Set([left.id]))
  })

  test('previous starts at the last frame and continues from a selected child', () => {
    const { editor, inSection, right } = frames()

    editor.zoomToPreviousFrame()
    expect(editor.state.selectedIds).toEqual(new Set([right.id]))

    const child = editor.graph.createNode('RECTANGLE', right.id, { width: 10, height: 10 })
    editor.select([child.id])
    editor.zoomToPreviousFrame()
    expect(editor.state.selectedIds).toEqual(new Set([inSection.id]))
  })

  test('zooms to the frame it selects', () => {
    const { editor, right } = frames()
    editor.zoomToPreviousFrame()
    const { panX, panY, zoom } = editor.state
    const centerX = (VIEWPORT.width / 2 - panX) / zoom
    const centerY = (VIEWPORT.height / 2 - panY) / zoom
    expect(centerX).toBeCloseTo(right.x + right.width / 2)
    expect(centerY).toBeCloseTo(right.y + right.height / 2)
  })
})

// The Slides panel: dragging a slide before or after another reorders the page's layers.
describe('slide order', () => {
  function slides() {
    const editor = createEditor({ getViewportSize: () => VIEWPORT })
    const pageId = editor.state.currentPageId
    const a = editor.graph.createNode('FRAME', pageId, { name: 'A', width: 100, height: 100 })
    const shape = editor.graph.createNode('RECTANGLE', pageId, { width: 10, height: 10 })
    const b = editor.graph.createNode('FRAME', pageId, { name: 'B', width: 100, height: 100 })
    const section = editor.graph.createNode('SECTION', pageId, { x: 500, width: 300 })
    const c = editor.graph.createNode('FRAME', section.id, { name: 'C', width: 100, height: 100 })
    const order = () => pageSlides(editor.graph, pageId).map((slide) => slide.name)
    function move(slideId: string, targetId: string, place: 'before' | 'after') {
      const target = slideMoveTarget(editor.graph, pageId, slideId, targetId, place)
      if (target) editor.reorderChildWithUndo(slideId, target.parentId, target.index)
      return target
    }
    return { editor, pageId, a, b, c, shape, section, order, move }
  }

  test('moves a slide before or after another among its siblings, as one undo step', () => {
    const { editor, a, b, order, move } = slides()
    expect(order()).toEqual(['A', 'B', 'C'])
    move(a.id, b.id, 'after')
    expect(order()).toEqual(['B', 'A', 'C'])
    editor.undoAction()
    expect(order()).toEqual(['A', 'B', 'C'])
    move(b.id, a.id, 'before')
    expect(order()).toEqual(['B', 'A', 'C'])
  })

  test('a slide dropped next to a slide in a section joins that section', () => {
    const { editor, a, c, section, order, move } = slides()
    move(a.id, c.id, 'after')
    expect(order()).toEqual(['B', 'C', 'A'])
    expect(editor.graph.getNode(a.id)?.parentId).toBe(section.id)
  })

  test('a drop that keeps the order, or onto a layer that is not a slide, changes nothing', () => {
    const { a, b, shape, move } = slides()
    expect(move(a.id, b.id, 'before')).toBeNull()
    expect(move(b.id, a.id, 'after')).toBeNull()
    expect(move(a.id, a.id, 'after')).toBeNull()
    expect(move(a.id, shape.id, 'after')).toBeNull()
  })
})
