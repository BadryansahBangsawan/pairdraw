import { describe, expect, test } from 'bun:test'

import type { VectorNetwork, VectorSegment } from '@open-pencil/scene-graph'
import Matrix from '@open-pencil/scene-graph/matrix'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import {
  boxCorners,
  rotateBoxMatrix,
  rotationAbout,
  scaleBoxMatrix,
  scalesBox,
  selectedVectorPoints,
  transformBoxPoints,
  transformVectorPoints,
  vectorPointsBox
} from '#core/vector/point-transform'

const zero = () => ({ x: 0, y: 0 })

function line(start: number, end: number): VectorSegment {
  return { start, end, tangentStart: zero(), tangentEnd: zero() }
}

/** An open path 0 → 1 → 2 → 3 around three sides of a square, with a handle out of point 1. */
const PATH: VectorNetwork = {
  vertices: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ],
  segments: [line(0, 1), { ...line(1, 2), tangentStart: { x: 20, y: 0 } }, line(2, 3)],
  regions: []
}

const BOX = { x: 0, y: 0, width: 100, height: 100 }

function expectPoint(actual: Vector, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x, 9)
  expect(actual.y).toBeCloseTo(y, 9)
}

describe('selectedVectorPoints and vectorPointsBox', () => {
  test('take the selected points and the ends of the selected segments, once each', () => {
    expect(selectedVectorPoints(PATH, [1, 9], [1, 7]).sort()).toEqual([1, 2])
  })

  test('box two points or more, flat for a row of points, and nothing for one', () => {
    expect(vectorPointsBox(PATH.vertices, [0, 2])).toEqual(BOX)
    expect(vectorPointsBox(PATH.vertices, [0, 1])).toEqual({ x: 0, y: 0, width: 100, height: 0 })
    expect(vectorPointsBox(PATH.vertices, [1])).toBeNull()
  })
})

describe('transformVectorPoints', () => {
  test('moves only the given points and turns the handles that leave them', () => {
    const quarter = rotateBoxMatrix({ x: 100, y: 0 }, Math.PI / 2)
    const turned = transformVectorPoints(PATH, [1, 2], quarter)
    expectPoint(turned.vertices[1], 100, 0)
    expectPoint(turned.vertices[2], 0, 0)
    expectPoint(turned.segments[1].tangentStart, 0, 20)
    // Point 3 did not move, and its handle on segment 2 stays as it was.
    expect(turned.vertices[3]).toEqual(PATH.vertices[3])
    expect(turned.segments[2].tangentEnd).toEqual(zero())
    expect(PATH.vertices[2]).toEqual({ x: 100, y: 100 })
  })
})

describe('scaleBoxMatrix', () => {
  test('a corner handle scales from the opposite corner', () => {
    const m = scaleBoxMatrix(BOX, 'se', { x: 100, y: 50 })
    expectPoint(Matrix.mapPoint(m, { x: 0, y: 0 }), 0, 0)
    expectPoint(Matrix.mapPoint(m, { x: 100, y: 100 }), 200, 150)
  })

  test('an edge handle scales only its own axis, from the opposite side', () => {
    const m = scaleBoxMatrix(BOX, 'w', { x: 50, y: 30 })
    expectPoint(Matrix.mapPoint(m, { x: 100, y: 100 }), 100, 100)
    expectPoint(Matrix.mapPoint(m, { x: 0, y: 0 }), 50, 0)
  })

  test('⌥/Alt scales about the centre, twice as far', () => {
    const m = scaleBoxMatrix(BOX, 'e', { x: 25, y: 0 }, { fromCenter: true })
    expectPoint(Matrix.mapPoint(m, { x: 0, y: 0 }), -25, 0)
    expectPoint(Matrix.mapPoint(m, { x: 100, y: 0 }), 125, 0)
  })

  test('Shift keeps proportions by the larger stretch, and an edge grows about its centre line', () => {
    const corner = scaleBoxMatrix(BOX, 'se', { x: 100, y: 10 }, { uniform: true })
    expectPoint(Matrix.mapPoint(corner, { x: 100, y: 100 }), 200, 200)
    const edge = scaleBoxMatrix(BOX, 's', { x: 0, y: 100 }, { uniform: true })
    expectPoint(Matrix.mapPoint(edge, { x: 0, y: 0 }), -50, 0)
    expectPoint(Matrix.mapPoint(edge, { x: 100, y: 100 }), 150, 200)
  })

  test('dragging past the opposite side flips the points', () => {
    const m = scaleBoxMatrix(BOX, 'e', { x: -200, y: 0 })
    expectPoint(Matrix.mapPoint(m, { x: 100, y: 0 }), -100, 0)
  })

  test('a flat side has nothing to stretch', () => {
    const flat = { x: 0, y: 0, width: 100, height: 0 }
    expect(scalesBox(flat, 'n')).toBe(false)
    expect(scalesBox(flat, 'ne')).toBe(true)
    const m = scaleBoxMatrix(flat, 'ne', { x: 100, y: -40 })
    expectPoint(Matrix.mapPoint(m, { x: 100, y: 0 }), 200, 0)
  })
})

describe('rotation', () => {
  test('measures the turn clockwise about the centre, and Shift snaps it to 15°', () => {
    const center = { x: 50, y: 50 }
    expect(rotationAbout(center, { x: 100, y: 50 }, { x: 50, y: 100 })).toBeCloseTo(Math.PI / 2, 9)
    const snapped = rotationAbout(center, { x: 100, y: 50 }, { x: 100, y: 60 }, 15)
    expect(snapped).toBeCloseTo((15 * Math.PI) / 180, 9)
  })

  test('the box turns with the points', () => {
    const corners = boxCorners(BOX, rotateBoxMatrix({ x: 50, y: 50 }, Math.PI / 2))
    expectPoint(corners[0], 100, 0)
    expectPoint(corners[2], 0, 100)
  })
})

describe('transformBoxPoints', () => {
  test('takes a box once two parts are selected, not for a lone point or segment', () => {
    expect(transformBoxPoints(PATH, new Set([0]), new Set())).toEqual([])
    expect(transformBoxPoints(PATH, new Set(), new Set([1]))).toEqual([])
    expect(transformBoxPoints(PATH, new Set([0]), new Set([1])).sort()).toEqual([0, 1, 2])
    expect(transformBoxPoints(PATH, new Set([0, 3]), new Set())).toEqual([0, 3])
  })
})
