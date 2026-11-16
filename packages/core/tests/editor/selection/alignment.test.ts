import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'
import { createRect, firstPageId } from '#core-tests/helpers/scene'

import { createEditor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'

describe('single-node alignment to parent', () => {
  function setup() {
    const graph = new SceneGraph()
    const frame = graph.createNode('FRAME', firstPageId(graph), {
      name: 'Container',
      x: 0,
      y: 0,
      width: 400,
      height: 300
    })
    const child = createRect(graph, frame.id, {
      name: 'Child',
      x: 50,
      y: 50,
      width: 100,
      height: 80
    })
    return { graph, frame, child }
  }

  test('align left within parent', () => {
    const { graph, child } = setup()
    graph.updateNode(child.id, { x: 0 })
    expect(getNodeOrThrow(graph, child.id).x).toBe(0)
  })

  test('align right within parent', () => {
    const { graph, frame, child } = setup()
    const targetX = frame.width - child.width
    graph.updateNode(child.id, { x: targetX })
    expect(getNodeOrThrow(graph, child.id).x).toBe(300)
  })

  test('align center horizontal within parent', () => {
    const { graph, frame, child } = setup()
    const targetX = (frame.width - child.width) / 2
    graph.updateNode(child.id, { x: targetX })
    expect(getNodeOrThrow(graph, child.id).x).toBe(150)
  })

  test('align top within parent', () => {
    const { graph, child } = setup()
    graph.updateNode(child.id, { y: 0 })
    expect(getNodeOrThrow(graph, child.id).y).toBe(0)
  })

  test('align bottom within parent', () => {
    const { graph, frame, child } = setup()
    const targetY = frame.height - child.height
    graph.updateNode(child.id, { y: targetY })
    expect(getNodeOrThrow(graph, child.id).y).toBe(220)
  })

  test('align center vertical within parent', () => {
    const { graph, frame, child } = setup()
    const targetY = (frame.height - child.height) / 2
    graph.updateNode(child.id, { y: targetY })
    expect(getNodeOrThrow(graph, child.id).y).toBe(110)
  })
})

describe('multi-node alignment', () => {
  function setup() {
    const graph = new SceneGraph()
    const page = firstPageId(graph)
    const a = createRect(graph, page, { name: 'A', x: 10, y: 20, width: 50, height: 30 })
    const b = createRect(graph, page, { name: 'B', x: 100, y: 80, width: 60, height: 40 })
    const c = createRect(graph, page, { name: 'C', x: 200, y: 50, width: 40, height: 50 })
    return { graph, a, b, c }
  }

  test('align left — all nodes move to min x', () => {
    const { graph, a, b, c } = setup()
    const nodes = [a, b, c].map((n) => getNodeOrThrow(graph, n.id))
    const abs = nodes.map((n) => graph.getAbsolutePosition(n.id))
    const minX = Math.min(...abs.map((p) => p.x))

    for (const n of nodes) {
      const nodeAbs = graph.getAbsolutePosition(n.id)
      graph.updateNode(n.id, { x: n.x + (minX - nodeAbs.x) })
    }

    expect(getNodeOrThrow(graph, a.id).x).toBe(10)
    expect(getNodeOrThrow(graph, b.id).x).toBe(10)
    expect(getNodeOrThrow(graph, c.id).x).toBe(10)
  })

  test('align right — all nodes align to max right edge', () => {
    const { graph, a, b, c } = setup()
    const nodes = [a, b, c].map((n) => getNodeOrThrow(graph, n.id))
    const abs = nodes.map((n) => graph.getAbsolutePosition(n.id))
    const maxX = Math.max(...abs.map((p, i) => p.x + nodes[i].width))

    for (const n of nodes) {
      const nodeAbs = graph.getAbsolutePosition(n.id)
      const targetX = maxX - n.width
      graph.updateNode(n.id, { x: n.x + (targetX - nodeAbs.x) })
    }

    expect(getNodeOrThrow(graph, a.id).x).toBe(190)
    expect(getNodeOrThrow(graph, b.id).x).toBe(180)
    expect(getNodeOrThrow(graph, c.id).x).toBe(200)
  })

  test('align top — all nodes move to min y', () => {
    const { graph, a, b, c } = setup()
    const nodes = [a, b, c].map((n) => getNodeOrThrow(graph, n.id))
    const abs = nodes.map((n) => graph.getAbsolutePosition(n.id))
    const minY = Math.min(...abs.map((p) => p.y))

    for (const n of nodes) {
      const nodeAbs = graph.getAbsolutePosition(n.id)
      graph.updateNode(n.id, { y: n.y + (minY - nodeAbs.y) })
    }

    expect(getNodeOrThrow(graph, a.id).y).toBe(20)
    expect(getNodeOrThrow(graph, b.id).y).toBe(20)
    expect(getNodeOrThrow(graph, c.id).y).toBe(20)
  })
})

// Aligning layers an auto layout holds in place moves nothing, so it adds no undo step.
test('aligning auto layout children records no undo step', () => {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const row = editor.graph.createNode('FRAME', pageId, {
    width: 300,
    height: 100,
    layoutMode: 'HORIZONTAL',
    primaryAxisSizing: 'FIXED',
    counterAxisSizing: 'FIXED'
  })
  const a = editor.graph.createNode('RECTANGLE', row.id, { width: 40, height: 40 })
  const b = editor.graph.createNode('RECTANGLE', row.id, { width: 40, height: 60 })
  editor.runLayoutForNode(row.id)
  editor.alignNodes([a.id, b.id], 'vertical', 'max')
  expect(editor.undo.canUndo).toBe(false)
})

// A turned layer aligns by its drawn box, not by its origin and unturned size.
test('aligning left puts a rotated layer’s visible left edge on the target', () => {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const anchor = editor.graph.createNode('RECTANGLE', pageId, {
    x: 20,
    y: 0,
    width: 40,
    height: 40
  })
  const turned = editor.graph.createNode('RECTANGLE', pageId, {
    x: 200,
    y: 100,
    width: 100,
    height: 50,
    rotation: 45
  })
  editor.alignNodes([anchor.id, turned.id], 'horizontal', 'min')
  const box = getAxisAlignedWorldBounds(getNodeOrThrow(editor.graph, turned.id), editor.graph)
  expect(box.x).toBeCloseTo(20)
  expect(getAxisAlignedWorldBounds(getNodeOrThrow(editor.graph, anchor.id), editor.graph).x).toBe(
    20
  )
})

// A single turned layer aligns by its drawn box too, as a group of layers already does.
test('aligning one rotated layer puts its visible edge on the parent’s edge', () => {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const frame = editor.graph.createNode('FRAME', pageId, {
    x: 100,
    y: 100,
    width: 200,
    height: 200
  })
  const turned = editor.graph.createNode('RECTANGLE', frame.id, {
    x: 10,
    y: 10,
    width: 60,
    height: 60,
    rotation: 45
  })

  editor.alignNodes([turned.id], 'horizontal', 'min')

  const parent = getAxisAlignedWorldBounds(getNodeOrThrow(editor.graph, frame.id), editor.graph)
  const box = getAxisAlignedWorldBounds(getNodeOrThrow(editor.graph, turned.id), editor.graph)
  expect(box.x).toBeCloseTo(parent.x)
  // The drawn box overhangs the unturned one by 42.43 − 30 on each side.
  expect(getNodeOrThrow(editor.graph, turned.id).x).toBeCloseTo(12.426, 3)

  editor.alignNodes([turned.id], 'horizontal', 'min')
  expect(getNodeOrThrow(editor.graph, turned.id).x).toBeCloseTo(12.426, 3)
})
