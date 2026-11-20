import { describe, test, expect } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import { getNodeOrThrow } from '../helpers/assert'

describe('nudgeSelected', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id
    const rect = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Rect',
      x: 100,
      y: 200,
      width: 50,
      height: 50
    })
    editor.select([rect.id])
    return { editor, rect }
  }

  test('nudge moves selected node by 1px', () => {
    const { editor, rect } = setup()

    editor.nudgeSelected(1, 0)
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(101)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(200)

    editor.nudgeSelected(0, -1)
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(101)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(199)
  })

  test('shift nudge moves by 10px', () => {
    const { editor, rect } = setup()

    editor.nudgeSelected(10, 0)
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(110)

    editor.nudgeSelected(0, 10)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(210)
  })

  test('nudge is undoable as a single entry', () => {
    const { editor, rect } = setup()

    editor.nudgeSelected(1, 0)
    editor.nudgeSelected(1, 0)
    editor.nudgeSelected(1, 0)
    editor.flushNudge()

    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(103)
    expect(editor.undo.canUndo).toBe(true)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(100)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(200)

    editor.undo.redo()
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(103)
  })

  test('nudge skips locked nodes', () => {
    const { editor, rect } = setup()

    editor.graph.updateNode(rect.id, { locked: true })
    editor.nudgeSelected(10, 10)
    editor.flushNudge()
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(100)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(200)
    expect(editor.undo.canUndo).toBe(false)
  })

  test('nudge does nothing with no selection', () => {
    const { editor } = setup()

    editor.clearSelection()
    editor.nudgeSelected(10, 10)
    editor.flushNudge()
    expect(editor.undo.canUndo).toBe(false)
  })

  test('nudge moves multiple selected nodes', () => {
    const { editor, rect } = setup()
    const pageId = editor.graph.getPages()[0].id
    const rect2 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Rect2',
      x: 300,
      y: 400,
      width: 50,
      height: 50
    })
    editor.select([rect.id, rect2.id])

    editor.nudgeSelected(-5, 3)
    editor.flushNudge()

    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(95)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(203)
    expect(getNodeOrThrow(editor.graph, rect2.id).x).toBe(295)
    expect(getNodeOrThrow(editor.graph, rect2.id).y).toBe(403)
  })

  test('a layer selected partway through a run is restored by the same undo step', () => {
    const { editor, rect } = setup()
    const other = editor.graph.createNode('RECTANGLE', editor.graph.getPages()[0].id, {
      name: 'Other',
      x: 0,
      y: 0,
      width: 10,
      height: 10
    })

    editor.nudgeSelected(1, 0)
    editor.select([other.id])
    editor.nudgeSelected(1, 0)
    editor.select([rect.id, other.id])
    editor.nudgeSelected(0, 1)
    editor.flushNudge()

    expect(getNodeOrThrow(editor.graph, other.id).x).toBe(1)
    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(100)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(200)
    expect(getNodeOrThrow(editor.graph, other.id).x).toBe(0)
    expect(getNodeOrThrow(editor.graph, other.id).y).toBe(0)
  })

  test('separate nudge sequences create separate undo entries', () => {
    const { editor, rect } = setup()

    editor.nudgeSelected(5, 0)
    editor.flushNudge()

    editor.nudgeSelected(0, 5)
    editor.flushNudge()

    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(105)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(205)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(105)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(200)

    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, rect.id).x).toBe(100)
    expect(getNodeOrThrow(editor.graph, rect.id).y).toBe(200)
  })
})

// Orders read from Figma desktop 126 after the same keys on four 60 × 40 layers.
describe('arrow keys in an auto layout flow', () => {
  function flow(layoutMode: 'HORIZONTAL' | 'VERTICAL') {
    const editor = createEditor()
    const parent = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      layoutMode,
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      itemSpacing: 10
    })
    const [a, b, c, d] = ['A', 'B', 'C', 'D'].map((name) =>
      editor.graph.createNode('RECTANGLE', parent.id, { name, width: 60, height: 40 })
    )
    editor.runLayoutForNode(parent.id)
    const order = () => parent.childIds.map((id) => editor.graph.getNode(id)?.name).join('')
    return { editor, parent, a, b, c, d, order }
  }

  test('move a layer one slot along a row, Shift too, and not across it', () => {
    const { editor, a, b, order } = flow('HORIZONTAL')
    editor.select([b.id])
    editor.nudgeSelected(1, 0)
    expect(order()).toBe('ACBD')
    editor.nudgeSelected(10, 0)
    expect(order()).toBe('ACDB')
    editor.nudgeSelected(0, 1)
    expect(order()).toBe('ACDB')
    editor.nudgeSelected(-1, 0)
    expect(order()).toBe('ACBD')
    editor.select([a.id])
    editor.nudgeSelected(10, 0)
    expect(order()).toBe('CABD')
    editor.dispose()
  })

  test('move a layer along a column with Down and Up', () => {
    const { editor, b, order } = flow('VERTICAL')
    editor.select([b.id])
    editor.nudgeSelected(0, 1)
    expect(order()).toBe('ACBD')
    editor.nudgeSelected(1, 0)
    expect(order()).toBe('ACBD')
    editor.nudgeSelected(0, -1)
    expect(order()).toBe('ABCD')
    editor.dispose()
  })

  test('move each selected layer one slot, and keep one at the end in place', () => {
    const { editor, a, c, order } = flow('HORIZONTAL')
    editor.select([a.id, c.id])
    editor.nudgeSelected(1, 0)
    expect(order()).toBe('BADC')
    editor.nudgeSelected(1, 0)
    expect(order()).toBe('BDAC')
    editor.dispose()
  })

  test('a run of keys is one undo step, even undone straight away', () => {
    const { editor, b, order } = flow('HORIZONTAL')
    editor.select([b.id])
    editor.nudgeSelected(1, 0)
    editor.nudgeSelected(1, 0)
    editor.undoAction()
    expect(order()).toBe('ABCD')
    expect(editor.undo.canUndo).toBe(false)
    editor.redoAction()
    expect(order()).toBe('ACDB')
    editor.dispose()
  })
})

describe('nudging a layer with layout inside it', () => {
  class CountingGraph extends SceneGraph {
    reads = 0

    override getNode(id: string): SceneNode | undefined {
      this.reads++
      return super.getNode(id)
    }
  }

  test('moves the layer without laying out its untouched children', () => {
    const graph = new CountingGraph()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Row',
      width: 1200,
      height: 400,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED'
    })
    const children = 300
    for (let index = 0; index < children; index++) {
      graph.createNode('RECTANGLE', frame.id, {
        x: index * 4,
        y: 0,
        width: 4,
        height: 400
      })
    }
    const editor = createEditor({ graph })
    editor.state.currentPageId = page.id
    editor.select([frame.id])

    const startX = frame.x
    graph.reads = 0
    editor.nudgeSelected(1, 0)

    // A position change cannot change an auto layout; only the moved layer is read.
    expect(graph.reads).toBeLessThan(2 * (children + 1))
    expect(getNodeOrThrow(graph, frame.id).x).toBe(startX + 1)
    editor.dispose()
  })

  test('undoes and redoes the move without laying the untouched children out again', () => {
    const graph = new CountingGraph()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Row',
      width: 1200,
      height: 400,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED'
    })
    const children = 300
    for (let index = 0; index < children; index++) {
      graph.createNode('RECTANGLE', frame.id, { x: index * 4, y: 0, width: 4, height: 400 })
    }
    const editor = createEditor({ graph })
    editor.state.currentPageId = page.id
    editor.select([frame.id])
    const startX = frame.x
    editor.nudgeSelected(1, 0)
    editor.flushNudge()

    graph.reads = 0
    editor.undo.undo()
    expect(graph.reads).toBeLessThan(2 * (children + 1))
    expect(getNodeOrThrow(graph, frame.id).x).toBe(startX)

    graph.reads = 0
    editor.undo.redo()
    expect(graph.reads).toBeLessThan(2 * (children + 1))
    expect(getNodeOrThrow(graph, frame.id).x).toBe(startX + 1)
    editor.dispose()
  })

  test('keeps a flow child on its parent’s layout grid instead of moving it by a pixel', () => {
    const graph = new CountingGraph()
    const page = graph.getPages()[0]
    const row = graph.createNode('FRAME', page.id, {
      name: 'Row',
      width: 400,
      height: 40,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      itemSpacing: 10
    })
    const children = 50
    const cells = Array.from({ length: children }, (_, index) =>
      graph.createNode('RECTANGLE', row.id, { name: `Cell ${index}`, width: 10, height: 40 })
    )
    const editor = createEditor({ graph })
    editor.state.currentPageId = page.id
    // `createEditor` lays the row out, as opening a document does.
    const second = children > 1 ? cells[1] : undefined
    if (!second) throw new Error('Expected a second cell')
    editor.select([second.id])
    const slotX = getNodeOrThrow(graph, second.id).x
    const slotY = getNodeOrThrow(graph, second.id).y

    graph.reads = 0
    editor.nudgeSelected(1, 0)

    // The row reorders the child rather than moving it off the grid.
    expect(getNodeOrThrow(graph, second.id).y).toBe(slotY)
    expect(getNodeOrThrow(graph, second.id).x).not.toBe(slotX + 1)
    editor.dispose()
  })

  test('moves an absolutely positioned child inside an auto layout without laying the row out', () => {
    const graph = new CountingGraph()
    const page = graph.getPages()[0]
    const row = graph.createNode('FRAME', page.id, {
      name: 'Row',
      width: 1200,
      height: 400,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED'
    })
    const children = 300
    for (let index = 0; index < children; index++) {
      graph.createNode('RECTANGLE', row.id, { x: index * 4, y: 0, width: 4, height: 400 })
    }
    const floating = graph.createNode('RECTANGLE', row.id, {
      name: 'Floating',
      x: 600,
      y: 40,
      width: 80,
      height: 80,
      layoutPositioning: 'ABSOLUTE'
    })
    const editor = createEditor({ graph })
    editor.state.currentPageId = page.id
    editor.select([floating.id])
    const startX = floating.x

    graph.reads = 0
    editor.nudgeSelected(1, 0)

    expect(getNodeOrThrow(graph, floating.id).x).toBe(startX + 1)
    expect(graph.reads).toBeLessThan(2 * (children + 1))
    editor.dispose()
  })
})
