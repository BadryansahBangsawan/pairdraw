import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { ref } from 'vue'

import { createEditor, type Editor } from '@pairdraw/core'
import type { SceneNode, Stroke } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'

import {
  onSelectionHandle,
  scaleFactorFromDrag,
  scaleHoverCursor,
  scaleFrame,
  scaleOrigin,
  tryStartScaleDrag
} from '#vue/canvas/scale/input'
import { CANVAS_TOOLS, type CanvasToolContext } from '#vue/canvas/tools/registry'
import type { DragState } from '#vue/shared/input/types'

const STROKE: Stroke = {
  type: 'SOLID',
  color: { r: 0, g: 0, b: 0, a: 1 },
  weight: 2,
  opacity: 1,
  visible: true,
  align: 'CENTER'
}

let editor: Editor

beforeEach(() => {
  editor = createEditor()
  editor.setTool('SCALE')
})

afterEach(() => editor.dispose())

function rect(props: Partial<SceneNode>) {
  return editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
    width: 100,
    height: 50,
    ...props
  })
}

function box(id: string) {
  const node = editor.graph.getNode(id)
  if (!node) throw new Error(`node ${id} is missing`)
  const { x, y, width, height } = getAxisAlignedWorldBounds(node, editor.graph)
  return [x, y, width, height]
}

function drag(from: [number, number], to: [number, number], altKey = false) {
  return dragThrough(from, [to], altKey)
}

/** A drag that moves through each point in turn, as mousemoves would. */
function dragThrough(from: [number, number], path: [number, number][], altKey = false) {
  const scale = tryStartScaleDrag(from[0], from[1], editor)
  if (!scale) throw new Error('expected a scale drag')
  for (const [x, y] of path) scale.update(x, y, x, y, altKey)
  return scale
}

function rounded(values: number[]) {
  return values.map((value) => Math.round(value * 1000) / 1000)
}

function frameOf() {
  const frame = scaleFrame(editor)
  if (!frame) throw new Error('expected a scale frame')
  return frame
}

describe('scale handle math', () => {
  test('a corner drag keeps proportions, as a Shift resize from it would', () => {
    const r = { x: 0, y: 0, width: 100, height: 50 }
    expect(scaleFactorFromDrag(r, 'se', 100, 0, false)).toBe(2)
    expect(scaleFactorFromDrag(r, 'se', -50, -25, false)).toBe(0.5)
    expect(scaleFactorFromDrag(r, 'nw', -100, 0, false)).toBe(2)
  })

  test('from the center the drag counts on both sides', () => {
    const r = { x: 0, y: 0, width: 100, height: 50 }
    expect(scaleFactorFromDrag(r, 'e', 50, 0, true)).toBe(2)
  })

  test('a box with no height scales along its width', () => {
    expect(scaleFactorFromDrag({ x: 0, y: 0, width: 100, height: 0 }, 'e', 50, 30, false)).toBe(1.5)
  })

  test('a handle scales from the opposite corner or side, or the center', () => {
    const r = { x: 10, y: 20, width: 100, height: 50 }
    expect(scaleOrigin(r, 'se', false)).toEqual({ x: 10, y: 20 })
    expect(scaleOrigin(r, 'n', false)).toEqual({ x: 60, y: 70 })
    expect(scaleOrigin(r, 'w', false)).toEqual({ x: 110, y: 45 })
    expect(scaleOrigin(r, 'se', true)).toEqual({ x: 60, y: 45 })
  })
})

describe('Scale tool drag', () => {
  test('a corner scales the layer with its stroke from the opposite corner, as one step', () => {
    const layer = rect({ x: 10, y: 10, strokes: [STROKE] })
    editor.select([layer.id])

    drag([110, 60], [210, 60]).commit()

    expect(box(layer.id)).toEqual([10, 10, 200, 100])
    expect(editor.graph.getNode(layer.id)?.strokes[0]?.weight).toBe(4)
    editor.undoAction()
    expect(box(layer.id)).toEqual([10, 10, 100, 50])
  })

  test('⌥ scales from the center', () => {
    const layer = rect({ x: 0, y: 0 })
    editor.select([layer.id])

    drag([100, 50], [150, 75], true).commit()

    expect(box(layer.id)).toEqual([-50, -25, 200, 100])
  })

  test('a multi-layer selection scales from the joint box', () => {
    const a = rect({ x: 0, y: 0 })
    const b = rect({ x: 200, y: 100 })
    editor.select([a.id, b.id])

    // The joint box runs 0..300 by 0..150; its top-left handle drags in to halve it.
    drag([0, 0], [150, 75]).commit()

    expect(box(a.id)).toEqual([150, 75, 50, 25])
    expect(box(b.id)).toEqual([250, 125, 50, 25])
  })

  test('cancelling puts the layer back without a step', () => {
    const layer = rect({ x: 10, y: 10 })
    editor.select([layer.id])

    drag([110, 60], [210, 60]).cancel()

    expect(box(layer.id)).toEqual([10, 10, 100, 50])
    expect(editor.undo.canUndo).toBe(false)
  })

  test('a press away from the handles is not a scale', () => {
    const layer = rect({ x: 10, y: 10 })
    editor.select([layer.id])
    expect(tryStartScaleDrag(60, 35, editor)).toBeNull()
    expect(scaleHoverCursor(60, 35, editor)).toBeNull()
    expect(scaleHoverCursor(110, 60, editor)).toStartWith('url(')
  })

  test('a read-only document offers no scale handles', () => {
    const layer = rect({ x: 10, y: 10 })
    editor.select([layer.id])
    editor.setReadOnly(true)
    expect(tryStartScaleDrag(110, 60, editor)).toBeNull()
  })

  test('a top-left drag through several moves measures from the box as it was at the press', () => {
    const layer = rect({ x: 0, y: 0 })
    editor.select([layer.id])

    const scale = dragThrough([0, 0], [
      [-10, -5],
      [-20, -10],
      [-100, -50]
    ])
    expect(box(layer.id)).toEqual([-100, -50, 200, 100])
    scale.commit()
    expect(box(layer.id)).toEqual([-100, -50, 200, 100])
  })

  test('a side handle keeps its opposite side fixed through several moves', () => {
    const layer = rect({ x: 0, y: 0 })
    editor.select([layer.id])

    dragThrough([100, 25], [
      [120, 25],
      [150, 25],
      [200, 25]
    ]).commit()

    expect(box(layer.id)).toEqual([0, -25, 200, 100])
  })

  test('⌥ scales from the center through several moves', () => {
    const layer = rect({ x: 0, y: 0 })
    editor.select([layer.id])

    dragThrough(
      [100, 50],
      [
        [110, 55],
        [130, 65],
        [150, 75]
      ],
      true
    ).commit()

    expect(box(layer.id)).toEqual([-50, -25, 200, 100])
  })

  test('a turned layer scales from its opposite corner through several moves', () => {
    const layer = rect({ x: 40, y: 30, rotation: 30 })
    editor.select([layer.id])
    const before = frameOf()
    const anchor = before.toWorld({ x: 100, y: 50 })
    const press = before.toWorld({ x: 0, y: 0 })
    const path = [0.2, 0.6, 1].map((t): [number, number] => {
      const point = before.toWorld({ x: -100 * t, y: -50 * t })
      return [point.x, point.y]
    })

    dragThrough([press.x, press.y], path).commit()

    const node = editor.graph.getNode(layer.id)
    expect(rounded([node?.width ?? 0, node?.height ?? 0, node?.rotation ?? 0])).toEqual([
      200, 100, 30
    ])
    const after = frameOf().toWorld({ x: 200, y: 100 })
    expect(rounded([after.x, after.y])).toEqual(rounded([anchor.x, anchor.y]))
  })
})

describe('Scale tool press on a handle that cannot scale', () => {
  function press(cx: number, cy: number) {
    const drags: DragState[] = []
    const none = () => null
    const context: CanvasToolContext = {
      editor,
      hitFns: {
        hitTestInScope: none,
        isInsideContainerBounds: () => false,
        hitTestSectionTitle: none,
        hitTestComponentLabel: none,
        hitTestFrameTitle: none
      },
      cursorOverride: ref(null),
      setDrag: (d) => drags.push(d),
      tryStartRotation: () => false,
      handleTextEditClick: () => false,
      bigNudge: () => 10,
      hoverLayers: () => undefined
    }
    const event = {
      button: 0,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false
    } as MouseEvent
    CANVAS_TOOLS.SCALE.press({ event, cx, cy, sx: cx, sy: cy }, context)
    return drags
  }

  test('a section handle neither scales nor resizes it', () => {
    const section = editor.graph.createNode('SECTION', editor.state.currentPageId, {
      width: 100,
      height: 50
    })
    editor.select([section.id])

    expect(tryStartScaleDrag(100, 50, editor)).toBeNull()
    expect(onSelectionHandle(100, 50, editor)).toBe(true)
    expect(press(100, 50)).toEqual([])
    expect(box(section.id)).toEqual([0, 0, 100, 50])
  })

  test("a locked layer's handle outside the scale box does not resize it", () => {
    const free = rect({ x: 0, y: 0 })
    const locked = rect({ x: 200, y: 100, locked: true })
    editor.select([free.id, locked.id])

    expect(press(300, 150).map((d) => d.type)).toEqual([])
  })

  test('a handle of a layer that scales starts a scale', () => {
    const layer = rect({ x: 0, y: 0 })
    editor.select([layer.id])
    expect(press(100, 50).map((d) => d.type)).toEqual(['scale'])
  })
})
