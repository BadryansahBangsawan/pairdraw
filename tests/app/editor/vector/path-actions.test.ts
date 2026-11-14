import { expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { SceneGraph, type VectorNetwork } from '@pairdraw/scene-graph'

import { createVectorEditActions } from '@/app/editor/vector/create'
import type { VectorEditState } from '@/app/editor/vector/types'

import { expectDefined } from '#tests/helpers/assert'

const zero = () => ({ x: 0, y: 0 })

/** An open path through four points: 0 → 1 → 2 → 3, placed at the page origin. */
const PATH: VectorNetwork = {
  vertices: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ],
  segments: [0, 1, 2].map((start) => ({
    start,
    end: start + 1,
    tangentStart: zero(),
    tangentEnd: zero()
  })),
  regions: []
}

function editPath() {
  const graph = new SceneGraph()
  const pageId = expectDefined(graph.getPages()[0]).id
  const vector = graph.createNode('VECTOR', pageId, {
    width: 100,
    height: 100,
    vectorNetwork: PATH
  })
  const editor = createEditor({ graph })
  const state: VectorEditState = Object.assign(editor.state, { nodeEditState: null })
  const actions = createVectorEditActions(editor, state)
  actions.enterNodeEditMode(vector.id)
  const es = () => expectDefined(state.nodeEditState)
  return { editor, graph, vector, state, actions, es }
}

const degree = (network: { segments: { start: number; end: number }[] }, vertex: number) =>
  network.segments.filter((s) => s.start === vertex || s.end === vertex).length

test('the cut tool cuts a segment where it is clicked and selects the two new end points', () => {
  const { actions, es } = editPath()
  actions.nodeEditSetCutTool(true)
  expect(es().cutTool).toBe(true)

  expect(actions.nodeEditCutAt(100, 40)).toBe(true)
  const cut = [...es().selectedVertexIndices]
  expect(cut).toHaveLength(2)
  for (const index of cut) {
    expect(es().vertices[index]).toMatchObject({ x: 100, y: 40 })
    expect(degree(es(), index)).toBe(1)
  }

  actions.nodeEditUndo()
  expect(es().vertices).toHaveLength(4)
  expect(es().segments).toHaveLength(3)
})

test('the cut tool parts a path at a point, and does nothing at an end point or off the path', () => {
  const { actions, es } = editPath()
  expect(actions.nodeEditCutAt(100, 0)).toBe(true)
  expect(es().vertices).toHaveLength(5)
  expect(degree(es(), 1)).toBe(1)

  expect(actions.nodeEditCutAt(0, 0)).toBe(false)
  expect(actions.nodeEditCutAt(50, 50)).toBe(false)
  expect(es().history).toHaveLength(1)
})

test('picking another tool puts the cut tool down', () => {
  const { editor, actions, es } = editPath()
  actions.nodeEditSetCutTool(true)
  editor.setTool('PEN')
  expect(es().cutTool).toBe(false)

  // Picking up the cut tool returns to selecting with the pointer.
  actions.nodeEditSetCutTool(true)
  expect(editor.state.activeTool).toBe('SELECT')
  expect(es().cutTool).toBe(true)
})

test('double-clicking a corner makes it smooth, and again makes it a corner', () => {
  const { actions, es } = editPath()
  actions.nodeEditToggleVertexSmooth(1)
  expect(es().segments[0].tangentEnd).not.toEqual(zero())
  expect(es().segments[1].tangentStart).not.toEqual(zero())
  expect([...es().selectedVertexIndices]).toEqual([1])

  actions.nodeEditToggleVertexSmooth(1)
  expect(es().segments[0].tangentEnd).toEqual(zero())
  expect(es().segments[1].tangentStart).toEqual(zero())

  actions.nodeEditUndo()
  expect(es().segments[0].tangentEnd).not.toEqual(zero())
})

test('straightening a segment removes its handles and selects it', () => {
  const { actions, es } = editPath()
  actions.nodeEditToggleVertexSmooth(1)
  actions.nodeEditStraightenSegment(1)
  expect(es().segments[1].tangentStart).toEqual(zero())
  expect(es().segments[0].tangentEnd).not.toEqual(zero())
  expect([...es().selectedSegmentIndices]).toEqual([1])
})

test('joining the two selected ends of a path closes it with a straight segment', () => {
  const { actions, es } = editPath()
  es().selectedVertexIndices = new Set([0, 3])
  expect(actions.nodeEditJoinEndpoints()).toBe(true)
  expect(es().segments).toHaveLength(4)
  expect(es().regions).toHaveLength(1)

  actions.nodeEditUndo()
  expect(es().segments).toHaveLength(3)
})

test('joining needs exactly two selected end points', () => {
  const { actions, es } = editPath()
  es().selectedVertexIndices = new Set([0])
  expect(actions.nodeEditJoinEndpoints()).toBe(false)
  es().selectedVertexIndices = new Set([0, 1, 3])
  // Point 1 is in the middle of the path, so the two end points still join.
  expect(actions.nodeEditJoinEndpoints()).toBe(true)
})

test('duplicating the selection copies it and selects the copies', () => {
  const { actions, es } = editPath()
  es().selectedSegmentIndices = new Set([1])
  const copies = expectDefined(actions.nodeEditDuplicateSelection())
  expect([...copies]).toEqual([
    [1, 4],
    [2, 5]
  ])
  expect(es().vertices).toHaveLength(6)
  expect([...es().selectedSegmentIndices]).toEqual([3])
  expect(es().selectedVertexIndices.size).toBe(0)
})

test('a cancelled ⌥/Alt drag drops the copies from the selection, so nudging still works', () => {
  const { actions, es } = editPath()
  es().selectedVertexIndices = new Set([1])
  // The press snapshots the path, then the drag copies the point.
  actions.nodeEditPushHistory()
  actions.nodeEditDuplicateSelection()
  expect([...es().selectedVertexIndices]).toEqual([4])

  actions.nodeEditCancelDrag()
  expect(es().vertices).toHaveLength(4)
  expect(es().selectedVertexIndices.size).toBe(0)
  expect(es().selectedSegmentIndices.size).toBe(0)
  expect(() => actions.nodeEditNudgeSelected(1, 0)).not.toThrow()
  expect(es().vertices[1]).toMatchObject({ x: 100, y: 0 })
})

test('a cancelled drag keeps the points it was dragging selected', () => {
  const { actions, es } = editPath()
  es().selectedVertexIndices = new Set([1])
  actions.nodeEditPushHistory()
  es().vertices[1] = { ...es().vertices[1], x: 150 }
  actions.nodeEditCancelDrag()
  expect(es().vertices[1]).toMatchObject({ x: 100, y: 0 })
  expect([...es().selectedVertexIndices]).toEqual([1])
})

test('dropping an end point on the other end closes the path and fills it, as joining does', () => {
  const { actions, es } = editPath()
  es().vertices[3] = { ...es().vertices[3], x: 2, y: 2 }
  actions.nodeEditConnectEndpoints(3, 0)
  expect(es().vertices).toHaveLength(3)
  // The dropped point joins the one it was dropped on, which stays where it is.
  expect(es().vertices[0]).toMatchObject({ x: 0, y: 0 })
  expect([...es().selectedVertexIndices]).toEqual([0])
  expect(es().regions).toEqual([{ windingRule: 'NONZERO', loops: [[0, 1, 2]] }])

  actions.nodeEditUndo()
  expect(es().vertices).toHaveLength(4)
})

test('breaking at a point (⌥/Alt+Delete) cuts as the cut tool does, so curves keep their handles', () => {
  const { actions, es } = editPath()
  actions.nodeEditToggleVertexSmooth(1)
  const handles = [es().segments[0].tangentEnd, es().segments[1].tangentStart]
  es().selectedVertexIndices = new Set([1])
  actions.nodeEditBreakAtVertex()
  expect(es().vertices).toHaveLength(5)
  expect(degree(es(), 1)).toBe(1)
  expect([es().segments[0].tangentEnd, es().segments[1].tangentStart]).toEqual(handles)
})

test('the arrow keys move the selected points, and a held key undoes as one move', () => {
  const { actions, es } = editPath()
  expect(actions.nodeEditNudgeSelected(1, 0)).toBe(false)

  es().selectedSegmentIndices = new Set([0])
  expect(actions.nodeEditNudgeSelected(10, 0)).toBe(true)
  expect(actions.nodeEditNudgeSelected(10, 0, false)).toBe(true)
  expect(es().vertices[0]).toMatchObject({ x: 20, y: 0 })
  expect(es().vertices[1]).toMatchObject({ x: 120, y: 0 })
  expect(es().vertices[2]).toMatchObject({ x: 100, y: 100 })

  actions.nodeEditUndo()
  expect(es().vertices[0]).toMatchObject({ x: 0, y: 0 })
})

test('path edits reach the layer when the path is closed', () => {
  const { graph, vector, actions } = editPath()
  actions.nodeEditCutAt(100, 50)
  actions.exitNodeEditMode(true)
  const network = expectDefined(graph.getNode(vector.id)?.vectorNetwork)
  expect(network.vertices).toHaveLength(6)
})
