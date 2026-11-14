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

const BOX = { x: 0, y: 0, width: 100, height: 100 }

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
  return { editor, graph, vector, actions, es }
}

test('a ⌘/Ctrl drag bends a segment from the path the press found, and commits as one step', () => {
  const { editor, graph, vector, actions, es } = editPath()
  actions.nodeEditPushHistory()
  const origin = actions.getLiveNetwork(es())
  actions.nodeEditBendSegment(origin, 0, 0.5, { x: 0, y: 60 }, false)
  actions.nodeEditBendSegment(origin, 0, 0.5, { x: 0, y: 30 }, false)
  expect(es().segments[0].tangentStart.y).toBeCloseTo(40, 9)
  expect(es().segments[0].tangentEnd.y).toBeCloseTo(40, 9)
  expect(es().vertices[1]).toMatchObject({ x: 100, y: 0 })

  actions.commitNodeEditChanges()
  const committed = expectDefined(graph.getNode(vector.id)?.vectorNetwork)
  expect(committed.segments[0].tangentStart.y).toBeCloseTo(40, 6)

  editor.undo.undo()
  const restored = expectDefined(graph.getNode(vector.id)?.vectorNetwork)
  expect(restored.segments[0].tangentStart).toEqual(zero())
})

test('a cancelled bend puts the segment back', () => {
  const { actions, es } = editPath()
  actions.nodeEditPushHistory()
  actions.nodeEditBendSegment(actions.getLiveNetwork(es()), 1, 0.5, { x: 30, y: 0 }, true)
  expect(es().segments[1].tangentStart.x).not.toBe(0)
  actions.nodeEditCancelDrag()
  expect(es().segments[1].tangentStart).toEqual(zero())
})

test('the transform box scales the selected points from the opposite corner', () => {
  const { actions, es } = editPath()
  es().selectedVertexIndices = new Set([0, 1, 2])
  actions.nodeEditPushHistory()
  const origin = actions.getLiveNetwork(es())
  actions.nodeEditScalePoints(origin, [0, 1, 2], BOX, 'se', { x: 100, y: 100 }, {})
  expect(es().vertices[2]).toMatchObject({ x: 200, y: 200 })
  expect(es().vertices[1]).toMatchObject({ x: 200, y: 0 })
  // Point 3 is not selected, so it stays.
  expect(es().vertices[3]).toMatchObject({ x: 0, y: 100 })
  expect(expectDefined(es().transformBox)[2]).toEqual({ x: 200, y: 200 })

  actions.nodeEditEndPointsTransform()
  expect(es().transformBox).toBeNull()
  expect([...es().selectedVertexIndices]).toEqual([0, 1, 2])
})

test('the transform box turns the selected points about its centre, and Shift snaps to 15°', () => {
  const { actions, es } = editPath()
  actions.nodeEditPushHistory()
  const origin = actions.getLiveNetwork(es())
  const points = [0, 1, 2, 3]
  // A quarter turn clockwise: from the right of the centre to below it.
  actions.nodeEditRotatePoints(origin, points, BOX, { x: 150, y: 50 }, { x: 50, y: 150 }, false)
  expect(es().vertices[0].x).toBeCloseTo(100, 9)
  expect(es().vertices[0].y).toBeCloseTo(0, 9)
  // The box turned with them.
  const corners = expectDefined(es().transformBox)
  expect(corners[0].x).toBeCloseTo(100, 9)

  actions.nodeEditRotatePoints(origin, points, BOX, { x: 150, y: 50 }, { x: 150, y: 80 }, true)
  const turned = es().vertices[1]
  // 15° clockwise about (50, 50) carries (100, 0) along the circle.
  expect(Math.hypot(turned.x - 50, turned.y - 50)).toBeCloseTo(Math.hypot(50, 50), 9)
  expect(Math.atan2(turned.y - 50, turned.x - 50)).toBeCloseTo(-Math.PI / 4 + Math.PI / 12, 9)

  actions.nodeEditCancelDrag()
  expect(es().vertices[1]).toMatchObject({ x: 100, y: 0 })
  expect(es().transformBox).toBeNull()
})
