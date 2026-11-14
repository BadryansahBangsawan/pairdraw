import { describe, expect, test } from 'bun:test'

import type { VectorNetwork, VectorSegment } from '@pairdraw/scene-graph'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import { bendSegment } from '#core/vector/bend'
import { evalCubic, segmentToAbsolute } from '#core/vector/curve-math'

const zero = () => ({ x: 0, y: 0 })

function line(start: number, end: number): VectorSegment {
  return { start, end, tangentStart: zero(), tangentEnd: zero() }
}

/** An open path through three points: 0 → 1 → 2, a straight line then a turn down. */
const OPEN: VectorNetwork = {
  vertices: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 }
  ],
  segments: [line(0, 1), line(1, 2)],
  regions: []
}

/** The same path with point 1 smooth: its two handles mirror each other in angle and length. */
const SMOOTH: VectorNetwork = {
  vertices: [
    { x: 0, y: 0 },
    { x: 100, y: 0, handleMirroring: 'ANGLE_AND_LENGTH' },
    { x: 200, y: 0 }
  ],
  segments: [
    { start: 0, end: 1, tangentStart: zero(), tangentEnd: { x: -30, y: 0 } },
    { start: 1, end: 2, tangentStart: { x: 30, y: 0 }, tangentEnd: zero() }
  ],
  regions: []
}

function pointAt(network: VectorNetwork, segmentIndex: number, t: number): Vector {
  const { p0, cp1, cp2, p3 } = segmentToAbsolute(network, segmentIndex)
  return evalCubic(p0.x, p0.y, cp1.x, cp1.y, cp2.x, cp2.y, p3.x, p3.y, t)
}

describe('bendSegment', () => {
  test('carries the dragged point of the segment to the pointer', () => {
    for (const t of [0.3, 0.5, 0.7]) {
      const before = pointAt(OPEN, 0, t)
      const bent = bendSegment(OPEN, 0, t, { x: 10, y: 40 })
      const after = pointAt(bent, 0, t)
      expect(after.x).toBeCloseTo(before.x + 10, 6)
      expect(after.y).toBeCloseTo(before.y + 40, 6)
    }
  })

  test('bows a straight segment from its middle into an even arc', () => {
    const bent = bendSegment(OPEN, 0, 0.5, { x: 0, y: 30 })
    expect(bent.segments[0].tangentStart.x).toBeCloseTo(0, 9)
    expect(bent.segments[0].tangentStart.y).toBeCloseTo(40, 9)
    expect(bent.segments[0].tangentEnd.x).toBeCloseTo(0, 9)
    expect(bent.segments[0].tangentEnd.y).toBeCloseTo(40, 9)
    // The points stay put, and the original network is untouched.
    expect(bent.vertices).toEqual(OPEN.vertices)
    expect(OPEN.segments[0].tangentStart).toEqual(zero())
  })

  test('bends from near an end as if pressed a little way in, so the handles stay in reach', () => {
    const bent = bendSegment(OPEN, 0, 0.01, { x: 0, y: 10 })
    const handle = Math.hypot(bent.segments[0].tangentStart.x, bent.segments[0].tangentStart.y)
    expect(handle).toBeLessThan(60)
    expect(pointAt(bent, 0, 0.15).y).toBeCloseTo(10, 6)
  })

  test('turns the other handle of a smooth point with the bent one', () => {
    const bent = bendSegment(SMOOTH, 0, 0.5, { x: 0, y: 20 })
    const bentEnd = bent.segments[0].tangentEnd
    expect(bent.segments[1].tangentStart.x).toBeCloseTo(-bentEnd.x, 9)
    expect(bent.segments[1].tangentStart.y).toBeCloseTo(-bentEnd.y, 9)
    expect(bent.vertices[1].handleMirroring).toBe('ANGLE_AND_LENGTH')
  })

  test('keeps a smooth point smooth when its handles only line up, as points read from SVG do', () => {
    const unmarked: VectorNetwork = {
      ...SMOOTH,
      vertices: SMOOTH.vertices.map(({ x, y }) => ({ x, y })),
      segments: [
        { ...SMOOTH.segments[0], tangentEnd: { x: -30, y: 0 } },
        { ...SMOOTH.segments[1], tangentStart: { x: 60, y: 0 } }
      ]
    }
    const bent = bendSegment(unmarked, 0, 0.5, { x: 0, y: 20 })
    const own = bent.segments[0].tangentEnd
    const other = bent.segments[1].tangentStart
    // Opposite directions, and the other handle keeps its length.
    expect(own.x * other.y - own.y * other.x).toBeCloseTo(0, 6)
    expect(own.x * other.x + own.y * other.y).toBeLessThan(0)
    expect(Math.hypot(other.x, other.y)).toBeCloseTo(60, 6)
  })

  test('with keepNeighbours leaves the neighbouring handles and makes the point a corner', () => {
    const bent = bendSegment(SMOOTH, 0, 0.5, { x: 0, y: 20 }, { keepNeighbours: true })
    expect(bent.segments[1].tangentStart).toEqual({ x: 30, y: 0 })
    expect(bent.vertices[1].handleMirroring).toBe('NONE')
    expect(pointAt(bent, 0, 0.5).y).toBeCloseTo(20, 6)
  })

  test('leaves a corner between straight segments alone either way', () => {
    const bent = bendSegment(OPEN, 1, 0.5, { x: 20, y: 0 })
    expect(bent.segments[0]).toEqual(OPEN.segments[0])
  })

  test('returns the network as it is for a segment that does not exist', () => {
    expect(bendSegment(OPEN, 5, 0.5, { x: 1, y: 1 })).toBe(OPEN)
  })
})
