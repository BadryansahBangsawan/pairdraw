import { describe, expect, test } from 'bun:test'

import type { VectorNetwork, VectorSegment } from '@open-pencil/scene-graph'

import {
  breakAtVertex,
  cutAtVertex,
  cutSegmentAt,
  duplicateVectorParts,
  isSmoothVertex,
  joinEndpoints,
  straightenSegment,
  toggleVertexSmooth
} from '#core/vector/edit'

const zero = () => ({ x: 0, y: 0 })

function line(start: number, end: number): VectorSegment {
  return { start, end, tangentStart: zero(), tangentEnd: zero() }
}

/** An open path through four points: 0 → 1 → 2 → 3. */
const OPEN: VectorNetwork = {
  vertices: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ],
  segments: [line(0, 1), line(1, 2), line(2, 3)],
  regions: []
}

/** A closed square, filled. */
const SQUARE: VectorNetwork = {
  ...OPEN,
  segments: [...OPEN.segments, line(3, 0)],
  regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }]
}

const ends = (network: VectorNetwork) => network.segments.map((s) => [s.start, s.end])
const degree = (network: VectorNetwork, vertex: number) =>
  network.segments.filter((s) => s.start === vertex || s.end === vertex).length

describe('cutting a path', () => {
  test('cutting a point between two segments leaves two end points in its place', () => {
    const { network, vertexIndices } = cutAtVertex(OPEN, 1)
    expect(vertexIndices).toEqual([1, 4])
    expect(network.vertices[4]).toMatchObject({ x: 100, y: 0 })
    expect(degree(network, 1)).toBe(1)
    expect(degree(network, 4)).toBe(1)
  })

  test('breaking a path at a point is the same edit as cutting it there', () => {
    expect(breakAtVertex(SQUARE, 1)).toEqual(cutAtVertex(SQUARE, 1).network)
  })

  test('cutting a point keeps the handles of the curves on either side', () => {
    const curved: VectorNetwork = {
      ...OPEN,
      segments: [
        { ...line(0, 1), tangentEnd: { x: -20, y: 10 } },
        { ...line(1, 2), tangentStart: { x: 20, y: -10 } },
        line(2, 3)
      ]
    }
    const { network } = cutAtVertex(curved, 1)
    expect(network.segments[0].tangentEnd).toEqual({ x: -20, y: 10 })
    expect(network.segments[1].tangentStart).toEqual({ x: 20, y: -10 })
  })

  test('an end point has nothing to cut', () => {
    expect(cutAtVertex(OPEN, 0).network).toBe(OPEN)
  })

  test('cutting a closed square opens it, so it no longer fills', () => {
    const { network } = cutAtVertex(SQUARE, 2)
    expect(network.regions).toEqual([])
    expect(network.segments).toHaveLength(4)
  })

  test('cutting a segment splits it and leaves two end points where it was cut', () => {
    const { network, vertexIndices } = cutSegmentAt(OPEN, 1, 0.5)
    expect(vertexIndices).toHaveLength(2)
    for (const index of vertexIndices) {
      expect(network.vertices[index]).toMatchObject({ x: 100, y: 50 })
      expect(degree(network, index)).toBe(1)
    }
    expect(network.segments).toHaveLength(4)
  })

  test('cutting a segment at its very end cuts its point', () => {
    const { network } = cutSegmentAt(OPEN, 1, 0)
    expect(network.vertices).toHaveLength(5)
    expect(degree(network, 1)).toBe(1)
  })

  test('cutting a side of a filled square drops only the loop it opens', () => {
    const twoRooms: VectorNetwork = {
      vertices: [...SQUARE.vertices, { x: 200, y: 0 }, { x: 200, y: 100 }],
      segments: [...SQUARE.segments, line(1, 4), line(4, 5), line(5, 2)],
      regions: [
        { windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] },
        { windingRule: 'NONZERO', loops: [[4, 5, 6, 1]] }
      ]
    }
    const { network } = cutSegmentAt(twoRooms, 3, 0.5)
    expect(network.regions).toEqual([{ windingRule: 'NONZERO', loops: [[4, 5, 6, 1]] }])
  })
})

describe('joining end points', () => {
  test('two end points apart get a straight segment, which closes and fills the path', () => {
    const result = joinEndpoints(OPEN, 3, 0)
    expect(result).not.toBeNull()
    if (!result) return
    expect(ends(result.network).at(-1)).toEqual([3, 0])
    expect(result.network.regions).toEqual([{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }])
    expect(result.vertexIndices).toEqual([3, 0])
  })

  test('end points of separate paths are joined without filling', () => {
    const two: VectorNetwork = {
      vertices: [...OPEN.vertices, { x: 200, y: 0 }, { x: 300, y: 0 }],
      segments: [...OPEN.segments, line(4, 5)],
      regions: []
    }
    const result = joinEndpoints(two, 3, 4)
    expect(result?.network.regions).toEqual([])
    expect(result && ends(result.network).at(-1)).toEqual([3, 4])
  })

  test('end points in the same place become one point where the second one is', () => {
    const touching: VectorNetwork = {
      ...OPEN,
      vertices: [...OPEN.vertices.slice(0, 3), { x: 2, y: 0 }]
    }
    const result = joinEndpoints(touching, 3, 0, 4)
    expect(result).not.toBeNull()
    if (!result) return
    expect(result.network.vertices).toHaveLength(3)
    expect(result.network.vertices[0]).toMatchObject({ x: 0, y: 0 })
    expect(result.vertexIndices).toEqual([0])
    expect(ends(result.network)).toEqual([
      [0, 1],
      [1, 2],
      [2, 0]
    ])
    expect(result.network.regions).toEqual([{ windingRule: 'NONZERO', loops: [[0, 1, 2]] }])
  })

  test('a point in the middle of a path is not joined', () => {
    expect(joinEndpoints(OPEN, 1, 3)).toBeNull()
  })

  test('an infinite tolerance always merges, as dropping one end point on another does', () => {
    const result = joinEndpoints(OPEN, 3, 0, Infinity)
    expect(result?.network.vertices).toHaveLength(3)
    expect(result?.vertexIndices).toEqual([0])
  })
})

describe('duplicating points', () => {
  test('selected points are copied with the segment between them, apart from the path', () => {
    const { network, vertices, segments } = duplicateVectorParts(OPEN, [1, 2])
    expect([...vertices]).toEqual([
      [1, 4],
      [2, 5]
    ])
    expect([...segments]).toEqual([[1, 3]])
    expect(ends(network)).toEqual([...ends(OPEN), [4, 5]])
  })

  test('a selected segment is copied with its points', () => {
    const { vertices, segments } = duplicateVectorParts(OPEN, [], [2])
    expect([...vertices.keys()]).toEqual([2, 3])
    expect([...segments.keys()]).toEqual([2])
  })

  test('a lone point stays joined to its copy', () => {
    const { network, vertices } = duplicateVectorParts(OPEN, [3])
    expect(vertices.get(3)).toBe(4)
    expect(ends(network).at(-1)).toEqual([3, 4])
  })

  test('a region whose loop is all copied is copied too', () => {
    const { network, regions } = duplicateVectorParts(SQUARE, [0, 1, 2, 3])
    expect(regions.get(0)).toBe(1)
    expect(network.regions[1].loops).toEqual([[4, 5, 6, 7]])
  })
})

describe('smooth and corner points', () => {
  test('a corner between two segments becomes smooth along the line through its neighbours', () => {
    const next = toggleVertexSmooth(OPEN, 1)
    expect(isSmoothVertex(next, 1)).toBe(true)
    // Neighbours (0,0) and (100,100): handles run along the diagonal, a third of each segment.
    const toBefore = next.segments[0].tangentEnd
    const toAfter = next.segments[1].tangentStart
    expect(toBefore.x).toBeCloseTo(-100 / 3 / Math.SQRT2)
    expect(toBefore.y).toBeCloseTo(-100 / 3 / Math.SQRT2)
    expect(toAfter.x).toBeCloseTo(100 / 3 / Math.SQRT2)
    expect(toAfter.y).toBeCloseTo(100 / 3 / Math.SQRT2)
    expect(next.vertices[1].handleMirroring).toBe('ANGLE')
  })

  test('a smooth point becomes a corner again', () => {
    const next = toggleVertexSmooth(toggleVertexSmooth(OPEN, 1), 1)
    expect(isSmoothVertex(next, 1)).toBe(false)
    expect(next.segments[0].tangentEnd).toEqual(zero())
    expect(next.vertices[1].handleMirroring).toBe('NONE')
  })

  test('an end point gets one handle toward its neighbour', () => {
    const next = toggleVertexSmooth(OPEN, 0)
    expect(next.segments[0].tangentStart.x).toBeCloseTo(100 / 3)
    expect(next.segments[0].tangentStart.y).toBeCloseTo(0)
  })

  test('straightening a segment removes both of its handles', () => {
    const curved = toggleVertexSmooth(OPEN, 1)
    const next = straightenSegment(curved, 0)
    expect(next.segments[0].tangentEnd).toEqual(zero())
    expect(next.segments[1].tangentStart).toEqual(curved.segments[1].tangentStart)
    expect(next.vertices[1].handleMirroring).toBe('NONE')
  })

  test('a straight segment stays as it is', () => {
    expect(straightenSegment(OPEN, 0)).toBe(OPEN)
  })
})
