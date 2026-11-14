import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { createEditor, ReadOnlyDocumentError, rescaleNodes } from '@pairdraw/core'
import type { SceneGraph, SceneNode, Stroke } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'

const STROKE: Stroke = {
  type: 'SOLID',
  color: { r: 0, g: 0, b: 0, a: 1 },
  weight: 2,
  opacity: 1,
  visible: true,
  align: 'CENTER'
}

function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const rect = (props: Partial<SceneNode>, parentId = pageId) =>
    editor.graph.createNode('RECTANGLE', parentId, { width: 100, height: 50, ...props })
  return { editor, pageId, rect }
}

function box(graph: SceneGraph, id: string) {
  const { x, y, width, height } = getAxisAlignedWorldBounds(getNodeOrThrow(graph, id), graph)
  return [x, y, width, height].map((value) => Math.round(value * 1000) / 1000)
}

describe('scaleNodes', () => {
  test('scales a layer with its stroke, radius, and children from its top left by default', () => {
    const { editor, pageId, rect } = setup()
    const frame = editor.graph.createNode('FRAME', pageId, {
      x: 10,
      y: 20,
      width: 200,
      height: 100,
      cornerRadius: 8,
      strokes: [STROKE]
    })
    const child = rect({ x: 20, y: 10, width: 40, height: 30 }, frame.id)

    expect(editor.scaleNodes([frame.id], 2)).toEqual([frame.id])

    const scaled = getNodeOrThrow(editor.graph, frame.id)
    expect([scaled.x, scaled.y, scaled.width, scaled.height, scaled.cornerRadius]).toEqual([
      10, 20, 400, 200, 16
    ])
    expect(scaled.strokes[0]?.weight).toBe(4)
    expect(box(editor.graph, child.id)).toEqual([50, 40, 80, 60])
  })

  test('scales a multi-layer selection around one anchor, keeping the gaps in proportion', () => {
    const { editor, rect } = setup()
    const a = rect({ x: 0, y: 0 })
    const b = rect({ x: 200, y: 100 })

    editor.scaleNodes([a.id, b.id], 0.5, 'bottom-right')

    // The joint box ran 0..300 by 0..150; its bottom-right corner stays put.
    expect(box(editor.graph, a.id)).toEqual([150, 75, 50, 25])
    expect(box(editor.graph, b.id)).toEqual([250, 125, 50, 25])
  })

  test('scales around the center of the joint box', () => {
    const { editor, rect } = setup()
    const a = rect({ x: 0, y: 0 })
    const b = rect({ x: 200, y: 100 })

    editor.scaleNodes([a.id, b.id], 2, 'center')

    expect(box(editor.graph, a.id)).toEqual([-150, -75, 200, 100])
    expect(box(editor.graph, b.id)).toEqual([250, 125, 200, 100])
  })

  test('a turned layer keeps its turn and scales around the anchor on the canvas', () => {
    const { editor, rect } = setup()
    const turned = rect({ x: 100, y: 100, rotation: 30 })
    const before = box(editor.graph, turned.id)

    editor.scaleNodes([turned.id], 3, 'center')

    const after = box(editor.graph, turned.id)
    expect(getNodeOrThrow(editor.graph, turned.id).rotation).toBe(30)
    expect(after[0] + after[2] / 2).toBeCloseTo(before[0] + before[2] / 2, 2)
    expect(after[1] + after[3] / 2).toBeCloseTo(before[1] + before[3] / 2, 2)
    expect(after[2]).toBeCloseTo(before[2] * 3, 2)
  })

  test('a layer inside a selected one scales with it, not twice', () => {
    const { editor, pageId, rect } = setup()
    const frame = editor.graph.createNode('FRAME', pageId, { width: 200, height: 100 })
    const child = rect({ x: 10, y: 10, width: 20, height: 20 }, frame.id)

    expect(editor.scaleNodes([frame.id, child.id], 2)).toEqual([frame.id])
    expect(box(editor.graph, child.id)).toEqual([20, 20, 40, 40])
  })

  test('one undo step puts every scaled layer back', () => {
    const { editor, rect } = setup()
    const a = rect({ x: 0, y: 0, strokes: [STROKE] })
    const b = rect({ x: 200, y: 100 })

    editor.scaleNodes([a.id, b.id], 2, 'center')
    editor.undoAction()

    expect(box(editor.graph, a.id)).toEqual([0, 0, 100, 50])
    expect(box(editor.graph, b.id)).toEqual([200, 100, 100, 50])
    expect(getNodeOrThrow(editor.graph, a.id).strokes[0]?.weight).toBe(2)
  })

  test('leaves locked layers and a factor of 1 alone', () => {
    const { editor, rect } = setup()
    const locked = rect({ locked: true })
    const free = rect({ x: 300 })

    expect(editor.scaleNodes([locked.id, free.id], 2)).toEqual([free.id])
    expect(getNodeOrThrow(editor.graph, locked.id).width).toBe(100)
    expect(editor.scaleNodes([free.id], 1)).toEqual([])
  })

  test('a read-only document refuses to scale', () => {
    const { editor, rect } = setup()
    const a = rect({})
    editor.setReadOnly(true)
    expect(() => editor.scaleNodes([a.id], 2)).toThrow(ReadOnlyDocumentError)
  })
})

describe('beginScale', () => {
  test('previews from the layers as they were and cancels back to them', () => {
    const { editor, rect } = setup()
    const a = rect({ x: 10, y: 10 })
    const session = editor.beginScale([a.id])
    if (!session) throw new Error('expected a scale session')

    session.update(2)
    session.update(3)
    expect(box(editor.graph, a.id)).toEqual([10, 10, 300, 150])

    session.cancel()
    expect(box(editor.graph, a.id)).toEqual([10, 10, 100, 50])
    expect(editor.undo.canUndo).toBe(false)
  })

  test('commits the last step as one undo step', () => {
    const { editor, rect } = setup()
    const a = rect({ x: 10, y: 10 })
    const session = editor.beginScale([a.id])
    if (!session) throw new Error('expected a scale session')

    session.update(2, { x: 0, y: 0 })
    session.update(0.5, { x: 0, y: 0 })
    session.commit()
    expect(box(editor.graph, a.id)).toEqual([5, 5, 50, 25])

    editor.undoAction()
    expect(box(editor.graph, a.id)).toEqual([10, 10, 100, 50])
  })

  test('is null when nothing selected can scale', () => {
    const { editor, pageId } = setup()
    const section = editor.graph.createNode('SECTION', pageId, { width: 100, height: 100 })
    expect(editor.beginScale([section.id])).toBeNull()
  })
})

describe('rescaleNodes', () => {
  test('scales the graph directly for callers that record their own step', () => {
    const { editor, rect } = setup()
    const a = rect({ x: 0, y: 0 })
    const b = rect({ x: 200, y: 100 })

    expect(rescaleNodes(editor.graph, [a.id, b.id], 2, 'top-left')).toEqual([a.id, b.id])
    expect(box(editor.graph, b.id)).toEqual([400, 200, 200, 100])
  })

  test('rejects factors a layer cannot take', () => {
    const { editor, rect } = setup()
    const a = rect({})
    expect(() => rescaleNodes(editor.graph, [a.id], 0)).toThrow(RangeError)
    expect(() => rescaleNodes(editor.graph, [a.id], Number.NaN)).toThrow(TypeError)
  })
})
