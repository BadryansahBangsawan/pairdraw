import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

describe('editor scoped hit testing', () => {
  test('uses world coordinates inside entered containers', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', pageId, {
      x: 100,
      y: 100,
      width: 200,
      height: 200
    })
    const child = editor.graph.createNode('RECTANGLE', frame.id, {
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    editor.state.enteredContainerId = frame.id
    editor.setCanvasKit(
      {} as Parameters<typeof editor.setCanvasKit>[0],
      {} as Parameters<typeof editor.setCanvasKit>[1]
    )

    expect(editor.hitTestAtPoint(130, 130)?.id).toBe(child.id)
  })
})

import {
  hitTestComponentLabel,
  hitTestFrameTitle,
  hitTestSectionTitle
} from '#core/canvas/labels/hit-test'

/** Glyphs of a fixed width, enough for a name's hit box without loading a font. */
const labelFont = {
  getGlyphIDs(text: string) {
    return Uint16Array.from([...text].map((_, index) => index))
  },
  getGlyphWidths(ids: Uint16Array) {
    return new Float32Array(ids.length).fill(8)
  }
} as Parameters<typeof hitTestFrameTitle>[5]

type LabelRenderer = Parameters<ReturnType<typeof createEditor>['setCanvasKit']>[1]

/**
 * One pane's canvas with the real label hit tests: a name is hit with that pane's page and zoom,
 * which the renderer keeps apart from the editor's current view. A stand-in CanvasKit is enough,
 * because a right-click reads names from the renderer.
 */
function labelRenderer(pageId: string, zoom: () => number): LabelRenderer {
  const hit =
    (testAt: typeof hitTestFrameTitle): LabelRenderer['hitTestFrameTitle'] =>
    (graph, x, y, preview, filter) =>
      testAt(graph, x, y, zoom(), pageId, labelFont, undefined, { preview, ...filter })
  return {
    hitTestFrameTitle: hit(hitTestFrameTitle),
    hitTestSectionTitle: hit(hitTestSectionTitle),
    hitTestComponentLabel: hit(hitTestComponentLabel)
  } as LabelRenderer
}

function installLabelHits(editor: ReturnType<typeof createEditor>) {
  editor.setCanvasKit(
    {} as Parameters<typeof editor.setCanvasKit>[0],
    labelRenderer(editor.state.currentPageId, () => editor.state.zoom)
  )
}

describe('selecting a layer by the name drawn above it', () => {
  test('selectAtPoint on a frame, section, or component name selects that layer', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'Frame',
      x: 100,
      y: 100,
      width: 200,
      height: 120
    })
    const section = editor.graph.createNode('SECTION', pageId, {
      name: 'Section',
      x: 400,
      y: 100,
      width: 200,
      height: 160
    })
    const component = editor.graph.createNode('COMPONENT', pageId, {
      name: 'Button',
      x: 100,
      y: 360,
      width: 120,
      height: 40
    })
    installLabelHits(editor)

    editor.select([frame.id])
    editor.selectAtPoint(108, 86)
    expect([...editor.state.selectedIds]).toEqual([frame.id])

    editor.clearSelection()
    editor.selectAtPoint(108, 86)
    expect([...editor.state.selectedIds]).toEqual([frame.id])

    editor.selectAtPoint(410, 80)
    expect([...editor.state.selectedIds]).toEqual([section.id])

    editor.selectAtPoint(108, 348)
    expect([...editor.state.selectedIds]).toEqual([component.id])

    editor.selectAtPoint(800, 800)
    expect([...editor.state.selectedIds]).toEqual([])
  })

  test('selectAtPoint on a frame name keeps a selection that already includes it', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'Frame',
      x: 100,
      y: 100,
      width: 200,
      height: 120
    })
    const other = editor.graph.createNode('RECTANGLE', pageId, {
      x: 400,
      y: 100,
      width: 80,
      height: 40
    })
    installLabelHits(editor)
    editor.select([other.id, frame.id])

    editor.selectAtPoint(108, 86)
    expect([...editor.state.selectedIds]).toEqual([other.id, frame.id])
  })

  test('selectAtPoint on a frame name uses the pane that was clicked', () => {
    const editor = createEditor()
    const pageA = editor.state.currentPageId
    const pageB = editor.graph.addPage('Other').id
    const frameA = editor.graph.createNode('FRAME', pageA, {
      name: 'Frame',
      x: 100,
      y: 100,
      width: 200,
      height: 120
    })
    const frameB = editor.graph.createNode('FRAME', pageB, {
      name: 'Frame',
      x: 100,
      y: 100,
      width: 200,
      height: 120
    })
    const paneA = labelRenderer(pageA, () => 1)
    const paneB = labelRenderer(pageB, () => 2)
    const canvasKit = {} as Parameters<typeof editor.setCanvasKit>[0]
    editor.setCanvasKit(canvasKit, paneA)
    editor.setCanvasKit(canvasKit, paneB)

    editor.state.currentPageId = pageB
    editor.state.zoom = 2
    editor.selectAtPoint(108, 91, paneB)
    expect([...editor.state.selectedIds]).toEqual([frameB.id])

    editor.state.currentPageId = pageA
    editor.state.zoom = 1
    editor.selectAtPoint(108, 91, paneA)
    expect([...editor.state.selectedIds]).toEqual([frameA.id])
  })

  // In Figma a right-click on a locked layer's name selects it, as one on its body does.
  test('selectAtPoint on a locked frame name selects that layer', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', pageId, {
      name: 'Locked',
      x: 100,
      y: 100,
      width: 200,
      height: 120,
      locked: true
    })
    installLabelHits(editor)

    editor.selectAtPoint(108, 86)
    expect([...editor.state.selectedIds]).toEqual([frame.id])
  })
})
