import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { SceneGraph } from '@pairdraw/scene-graph'

import { layoutFrameAtWidth, widthVariants } from '#core/tools/analyze/responsive/widths'

function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  return { graph, pageId }
}

describe('widthVariants', () => {
  test('offers the two narrower widths for a wide frame', () => {
    expect(widthVariants(1440)).toEqual([375, 768])
  })

  test('keeps a width only when it is narrower than the frame', () => {
    expect(widthVariants(768)).toEqual([375])
    expect(widthVariants(767)).toEqual([375])
    expect(widthVariants(375)).toEqual([])
    expect(widthVariants(300)).toEqual([])
  })

  test('rounds the frame width before comparing', () => {
    expect(widthVariants(768.4)).toEqual([375])
    expect(widthVariants(768.6)).toEqual([375, 768])
  })
})

describe('layoutFrameAtWidth', () => {
  function frameWithGrownChild(graph: SceneGraph, pageId: string) {
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Hero',
      width: 900,
      height: 600,
      layoutMode: 'HORIZONTAL'
    })
    const body = graph.createNode('FRAME', frame.id, {
      name: 'Body',
      width: 100,
      height: 100,
      layoutGrow: 1
    })
    return { frame, body }
  }

  test('lays out a copy at the width and reflows its auto layout', () => {
    const { graph, pageId } = setup()
    const { frame, body } = frameWithGrownChild(graph, pageId)

    const laid = layoutFrameAtWidth(graph, pageId, frame.id, 375)

    expect(laid).not.toBeNull()
    expect(laid?.frame.id).toBe(frame.id)
    expect(laid?.frame.width).toBe(375)
    expect(laid?.requested).toBe(375)
    expect(laid?.clamped).toBe(false)
    expect(laid?.pageId).toBe(pageId)
    expect(getNodeOrThrow(laid?.graph ?? graph, body.id).width).toBe(375)
  })

  test('leaves the document untouched', () => {
    const { graph, pageId } = setup()
    const { frame, body } = frameWithGrownChild(graph, pageId)

    const laid = layoutFrameAtWidth(graph, pageId, frame.id, 375)

    expect(laid?.graph).not.toBe(graph)
    expect(frame.width).toBe(900)
    expect(getNodeOrThrow(graph, body.id).width).toBe(100)
  })

  test('reports a width the frame min width clamps', () => {
    const { graph, pageId } = setup()
    const { frame } = frameWithGrownChild(graph, pageId)
    graph.updateNode(frame.id, { minWidth: 500 })

    const laid = layoutFrameAtWidth(graph, pageId, frame.id, 375)

    expect(laid?.frame.width).toBe(500)
    expect(laid?.requested).toBe(375)
    expect(laid?.clamped).toBe(true)
  })

  test('rounds the requested width', () => {
    const { graph, pageId } = setup()
    const { frame } = frameWithGrownChild(graph, pageId)

    const laid = layoutFrameAtWidth(graph, pageId, frame.id, 374.6)

    expect(laid?.frame.width).toBe(375)
    expect(laid?.requested).toBe(375)
  })

  test('returns null for a frame that is not in the graph', () => {
    const { graph, pageId } = setup()

    expect(layoutFrameAtWidth(graph, pageId, 'missing', 375)).toBeNull()
  })
})
