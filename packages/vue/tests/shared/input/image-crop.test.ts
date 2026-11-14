import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, editedImageLayout, type Editor } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'
import { getWorldMatrix } from '@pairdraw/scene-graph/coordinate'
import Matrix from '@pairdraw/scene-graph/matrix'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import { MOVE_CURSOR } from '#vue/shared/input/geometry'
import { imageCropCursor } from '#vue/shared/input/image-crop'
import { handleSelectDown, type HitTestFns } from '#vue/shared/input/select'
import type { DragState } from '#vue/shared/input/types'

// Image edit mode takes presses before the selection does: crop handles, the image's corners, and
// the image itself start a drag of their own, and a press outside them leaves the mode.

let editor: Editor

afterEach(() => editor.dispose())

/** A PNG header declaring a `width` × `height` image, which is all the crop reads of it. */
function pngHeader(width: number, height: number): Uint8Array {
  const header = new Uint8Array(33)
  const view = new DataView(header.buffer)
  header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  view.setUint32(16, width)
  view.setUint32(20, height)
  header.set([8, 6], 24)
  return header
}

/** A 200 × 100 rectangle at the origin with a 400 × 300 image, open in image edit mode. */
function setup(node: Partial<SceneNode> = {}) {
  editor = createEditor()
  const pageId = editor.state.currentPageId
  editor.graph.images.set('photo', pngHeader(400, 300))
  const rect = editor.graph.createNode('RECTANGLE', pageId, {
    ...node,
    width: 200,
    height: 100,
    fills: [
      {
        type: 'IMAGE',
        imageHash: 'photo',
        imageScaleMode: 'FILL',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true
      }
    ]
  })
  editor.startImageEdit(rect.id)
  const scope = () => editor.state.enteredContainerId ?? editor.state.currentPageId
  const fns: HitTestFns = {
    hitTestInScope: (cx, cy, deep) =>
      deep
        ? editor.graph.hitTestDeep(cx, cy, scope())
        : editor.graph.hitTestSelectable(cx, cy, scope(), editor.state.selectedIds),
    isInsideContainerBounds: (cx, cy, id) => editor.graph.isPointInNode(id, cx, cy),
    hitTestFrameTitle: () => null,
    hitTestSectionTitle: () => null,
    hitTestComponentLabel: () => null
  }
  // At 100% with no pan, canvas and screen points are the same.
  const pressAt = (x: number, y: number) => {
    let drag: DragState | null = null
    const event = { altKey: false, shiftKey: false, metaKey: false, ctrlKey: false } as MouseEvent
    handleSelectDown(
      event,
      x,
      y,
      x,
      y,
      editor,
      fns,
      () => false,
      () => false,
      (next) => {
        drag = next
      }
    )
    return drag as DragState | null
  }
  return { rect, pressAt }
}

function imageCropDrag(drag: DragState | null) {
  if (drag?.type !== 'image-crop') throw new Error(`expected an image crop drag, got ${drag?.type}`)
  return drag
}

describe('presses in image edit mode', () => {
  test('a crop edge resizes the layer as one undo step', () => {
    const { rect, pressAt } = setup()
    const drag = imageCropDrag(pressAt(200, 50))
    drag.update(150, 50, { shift: false, alt: false })
    expect(editor.graph.getNode(rect.id)?.width).toBeCloseTo(150, 6)
    drag.commit()
    editor.undoAction()
    expect(editor.graph.getNode(rect.id)?.width).toBe(200)
  })

  test('cancelling a drag puts the layer back', () => {
    const { rect, pressAt } = setup()
    const drag = imageCropDrag(pressAt(100, 50))
    drag.update(100, 60, { shift: false, alt: false })
    expect(editor.graph.getNode(rect.id)?.fills[0]?.imageScaleMode).toBe('CROP')
    drag.cancel()
    expect(editor.graph.getNode(rect.id)?.fills[0]?.imageScaleMode).toBe('FILL')
  })

  test('a press outside the image leaves the mode and is handled as usual', () => {
    const { pressAt } = setup()
    const drag = pressAt(500, 500)
    expect(editor.state.imageEdit).toBeNull()
    expect(drag?.type).toBe('marquee')
  })

  test('the cursor resizes over a handle and moves over the image', () => {
    setup()
    expect(imageCropCursor(editor, 100, 50)).toBe(MOVE_CURSOR)
    const edge = imageCropCursor(editor, 200, 50)
    expect(edge).not.toBeNull()
    expect(edge).not.toBe(MOVE_CURSOR)
    expect(imageCropCursor(editor, 500, 500)).toBeNull()
  })
})

// A real drag sends many moves. Each preview writes into the live layer, so the drag has to keep
// working from the layer as it was pressed, or later moves crop an already cropped layer.
describe('drags with many moves', () => {
  const NO_KEYS = { shift: false, alt: false }

  /** The layer's size and framing, and the image's corners on screen, after a drag. */
  function outcome(nodeId: string) {
    const node = editor.graph.getNode(nodeId)
    const layout = editedImageLayout(editor.graph, editor.state.imageEdit, editor.state)
    if (!node || !layout) throw new Error('expected the edited layer and its layout')
    return { node: { ...node }, transform: node.fills[0]?.imageTransform, image: layout.image }
  }

  /** Drags from `from` through `path`, then undoes it and drags straight to its end. */
  function compare(
    pressAt: (x: number, y: number) => DragState | null,
    nodeId: string,
    from: Vector,
    path: Vector[]
  ) {
    const steps = imageCropDrag(pressAt(from.x, from.y))
    for (const point of path) steps.update(point.x, point.y, NO_KEYS)
    steps.commit()
    const stepped = outcome(nodeId)
    editor.undoAction()
    const end = path.at(-1)
    if (!end) throw new Error('expected a path')
    const once = imageCropDrag(pressAt(from.x, from.y))
    once.update(end.x, end.y, NO_KEYS)
    once.commit()
    return { stepped, once: outcome(nodeId) }
  }

  function expectSame(actual: ReturnType<typeof outcome>, expected: ReturnType<typeof outcome>) {
    for (const key of ['x', 'y', 'width', 'height'] as const)
      expect(actual.node[key]).toBeCloseTo(expected.node[key], 6)
    for (const key of ['m00', 'm01', 'm02', 'm10', 'm11', 'm12'] as const)
      expect(actual.transform?.[key] ?? Number.NaN).toBeCloseTo(
        expected.transform?.[key] ?? Number.NaN,
        6
      )
    actual.image.forEach((point, index) => {
      expect(point.x).toBeCloseTo(expected.image[index].x, 4)
      expect(point.y).toBeCloseTo(expected.image[index].y, 4)
    })
  }

  test('an edge crops as one move would, keeping the image still', () => {
    const { rect, pressAt } = setup()
    const before = outcome(rect.id).image
    const { stepped, once } = compare(pressAt, rect.id, { x: 200, y: 50 }, [
      { x: 190, y: 50 },
      { x: 180, y: 50 },
      { x: 150, y: 50 }
    ])
    expect(stepped.node.width).toBeCloseTo(150, 6)
    // The 400 × 300 image covers 200 × 150 at first; 150 px of the layer show 0.75 of that.
    expect(stepped.transform?.m00 ?? 0).toBeCloseTo(0.75, 6)
    expectSame(stepped, once)
    expectSame(stepped, { ...stepped, image: before })
  })

  test('a corner crops as one move would', () => {
    const { rect, pressAt } = setup()
    const before = outcome(rect.id).image
    const { stepped, once } = compare(pressAt, rect.id, { x: 0, y: 0 }, [
      { x: 10, y: 5 },
      { x: 25, y: 12 },
      { x: 40, y: 20 }
    ])
    expect(stepped.node.width).toBeCloseTo(160, 6)
    expect(stepped.node.height).toBeCloseTo(80, 6)
    expectSame(stepped, once)
    expectSame(stepped, { ...stepped, image: before })
  })

  test('a turned layer crops as one move would, keeping the image still', () => {
    const { rect, pressAt } = setup({ x: 100, y: 100, rotation: 30 })
    const world = getWorldMatrix(rect, editor.graph)
    const at = (point: Vector) => Matrix.mapPoint(world, point)
    const before = outcome(rect.id).image
    const { stepped, once } = compare(pressAt, rect.id, at({ x: 200, y: 100 }), [
      at({ x: 190, y: 95 }),
      at({ x: 170, y: 80 }),
      at({ x: 150, y: 70 })
    ])
    expect(stepped.node.width).toBeCloseTo(150, 6)
    expect(stepped.node.height).toBeCloseTo(70, 6)
    expectSame(stepped, once)
    expectSame(stepped, { ...stepped, image: before })
  })
})
