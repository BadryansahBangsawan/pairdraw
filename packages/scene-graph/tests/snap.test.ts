import { describe, expect, test } from 'bun:test'

import type { SceneNode } from '@pairdraw/scene-graph'
import { createDefaultNode } from '@pairdraw/scene-graph/node-defaults'
import type { Rect } from '@pairdraw/scene-graph/primitives'
import {
  computeSpacingGuides,
  computeSpacingSnap,
  spacingTargets
} from '@pairdraw/scene-graph/snap'

const MOVING = new Set(['moving'])
const THRESHOLD = 5

function box(id: string, x: number, y: number, width = 40, height = 40): SceneNode {
  return createDefaultNode(() => id, 'RECTANGLE', { x, y, width, height })
}

function bounds(x: number, y: number, width = 40, height = 40): Rect {
  return { x, y, width, height }
}

describe('equal-spacing snap', () => {
  test('centres a layer between its two neighbours', () => {
    // a ends at 40 and b starts at 140: a 40-wide layer centred between them starts at 70.
    const nodes = [box('a', 0, 0), box('b', 140, 0)]
    expect(computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(72, 0), THRESHOLD)).toEqual({
      dx: -2,
      dy: null
    })
  })

  test('repeats the gap between two neighbours after the last of them', () => {
    // a and b are 20 apart, so after b (ending at 100) the next one starts at 120.
    const nodes = [box('a', 0, 0), box('b', 60, 0)]
    expect(computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(123, 5), THRESHOLD).dx).toBe(-3)
  })

  test('repeats the gap before the first neighbour', () => {
    const nodes = [box('a', 100, 0), box('b', 160, 0)]
    expect(computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(38, 0), THRESHOLD).dx).toBe(2)
  })

  test('snaps vertically in a column', () => {
    const nodes = [box('a', 0, 0), box('b', 0, 50)]
    expect(computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(0, 101), THRESHOLD)).toEqual({
      dx: null,
      dy: -1
    })
  })

  test('ignores layers that share no extent across the axis', () => {
    // b sits in another row, so a and b set no gap for the moving layer.
    const nodes = [box('a', 0, 0), box('b', 60, 200)]
    expect(
      computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(122, 0), THRESHOLD).dx
    ).toBeNull()
  })

  test('leaves a layer far from any equal gap alone', () => {
    const nodes = [box('a', 0, 0), box('b', 60, 0)]
    expect(
      computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(140, 0), THRESHOLD).dx
    ).toBeNull()
  })

  test('excludes the moving layers themselves', () => {
    const nodes = [box('moving', 120, 0), box('a', 0, 0), box('b', 60, 0)]
    expect(computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(122, 0), THRESHOLD).dx).toBe(-2)
  })

  test('a gap the moving layer sits in is not a gap to repeat', () => {
    // a and b are 100 apart with the layer between them; only centring applies.
    const nodes = [box('a', 0, 0), box('b', 140, 0)]
    expect(
      computeSpacingSnap(spacingTargets(MOVING, nodes), bounds(44, 0), THRESHOLD).dx
    ).toBeNull()
  })
})

describe('equal-spacing indicators', () => {
  test('mark both gaps of a centred layer', () => {
    const nodes = [box('a', 0, 0), box('b', 140, 0)]
    expect(computeSpacingGuides(spacingTargets(MOVING, nodes), bounds(70, 0))).toEqual([
      { axis: 'y', position: 20, from: 40, to: 70, spacing: true },
      { axis: 'y', position: 20, from: 110, to: 140, spacing: true }
    ])
  })

  test('mark the moving gap and every neighbour gap it matches', () => {
    const nodes = [box('a', 0, 0), box('b', 60, 0)]
    expect(computeSpacingGuides(spacingTargets(MOVING, nodes), bounds(120, 10))).toEqual([
      { axis: 'y', position: 25, from: 100, to: 120, spacing: true },
      { axis: 'y', position: 20, from: 40, to: 60, spacing: true }
    ])
  })

  test('mark vertical gaps on vertical lines', () => {
    const nodes = [box('a', 0, 0), box('b', 0, 50)]
    expect(computeSpacingGuides(spacingTargets(MOVING, nodes), bounds(0, 100))).toEqual([
      { axis: 'x', position: 20, from: 90, to: 100, spacing: true },
      { axis: 'x', position: 20, from: 40, to: 50, spacing: true }
    ])
  })

  test('show nothing when no gap matches', () => {
    const nodes = [box('a', 0, 0), box('b', 60, 0)]
    expect(computeSpacingGuides(spacingTargets(MOVING, nodes), bounds(130, 0))).toEqual([])
  })

  test('show nothing for layers that touch', () => {
    const nodes = [box('a', 0, 0), box('b', 40, 0)]
    expect(computeSpacingGuides(spacingTargets(MOVING, nodes), bounds(80, 0))).toEqual([])
  })
})

describe('equal spacing with overlapping siblings', () => {
  // Two buttons 20 apart, each a rectangle with a narrower text layer over it and no group.
  const buttons = [
    box('r1', 0, 0, 100, 40),
    box('t1', 20, 10, 60, 20),
    box('r2', 120, 0, 100, 40),
    box('t2', 140, 10, 60, 20)
  ]

  test('a gap across a layer that covers it is not a gap', () => {
    // t1 ends at 80 and r2 starts at 120, but r1 covers 80..100, so no gap of 40 exists.
    expect(
      computeSpacingSnap(spacingTargets(MOVING, buttons), bounds(258, 0, 100, 40), THRESHOLD).dx
    ).toBeNull()
  })

  test('repeats the real gap between the buttons', () => {
    expect(
      computeSpacingSnap(spacingTargets(MOVING, buttons), bounds(243, 0, 100, 40), THRESHOLD).dx
    ).toBe(-3)
  })

  test('marks no gap across a covering layer', () => {
    expect(computeSpacingGuides(spacingTargets(MOVING, buttons), bounds(260, 0, 100, 40))).toEqual(
      []
    )
  })

  test('marks the real gap between the buttons', () => {
    expect(computeSpacingGuides(spacingTargets(MOVING, buttons), bounds(240, 0, 100, 40))).toEqual([
      { axis: 'y', position: 20, from: 220, to: 240, spacing: true },
      { axis: 'y', position: 20, from: 100, to: 120, spacing: true }
    ])
  })
})

describe('spacing targets', () => {
  test('leave out the moving layers and sort each axis by start', () => {
    const targets = spacingTargets(MOVING, [box('b', 60, 0), box('moving', 0, 0), box('a', 0, 100)])
    expect(targets.x.map((span) => span.start)).toEqual([0, 60])
    expect(targets.y.map((span) => span.start)).toEqual([0, 100])
  })
})
