import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'

import { resolveObjectPixelSnap, type ExplicitSnapTarget } from '#vue/shared/input/snap'

const MOVING = new Set(['moving'])
const SPACING = { spacing: true }

function box(id: string, x: number, y: number, width = 40, height = 40): SceneNode {
  return createDefaultNode(() => id, 'RECTANGLE', { x, y, width, height })
}

function snappingEditor(objects = true) {
  const editor = createEditor()
  editor.state.snappingPreferences = { geometry: false, objects, pixelGrid: false }
  return editor
}

// a ends at 40 and b starts at 60: a 20 gap, so a layer after b lands at 120.
const ROW = [box('a', 0, 0), box('b', 60, 0)]

describe('equal-spacing snap during a move', () => {
  test('lands a layer on the gap its neighbours keep and marks the equal gaps', () => {
    const result = resolveObjectPixelSnap(
      MOVING,
      { x: 123, y: 0, width: 30, height: 20 },
      ROW,
      snappingEditor(),
      [],
      [],
      SPACING
    )
    expect(result.correction).toEqual({ x: -3, y: 0 })
    expect(result.guides.filter((guide) => guide.spacing)).toEqual([
      { axis: 'y', position: 10, from: 100, to: 120, spacing: true },
      { axis: 'y', position: 20, from: 40, to: 60, spacing: true }
    ])
  })

  test('is off unless the caller asks for it, as a resize does', () => {
    const result = resolveObjectPixelSnap(
      MOVING,
      { x: 123, y: 0, width: 30, height: 20 },
      ROW,
      snappingEditor()
    )
    expect(result.correction.x).toBe(0)
    expect(result.guides.some((guide) => guide.spacing)).toBe(false)
  })

  test('follows Snap to objects', () => {
    const result = resolveObjectPixelSnap(
      MOVING,
      { x: 123, y: 0, width: 30, height: 20 },
      ROW,
      snappingEditor(false),
      [],
      [],
      SPACING
    )
    expect(result.correction.x).toBe(0)
    expect(result.guides).toEqual([])
  })

  test('takes the nearer of alignment and equal spacing', () => {
    // The right edge at 156 is 1 from c's left edge at 157, and the gap 3 from 20.
    const nodes = [...ROW, box('c', 157, 100)]
    const aligned = resolveObjectPixelSnap(
      MOVING,
      { x: 123, y: 0, width: 33, height: 40 },
      nodes,
      snappingEditor(),
      [],
      [],
      SPACING
    )
    expect(aligned.correction.x).toBe(1)
    expect(aligned.guides.some((guide) => guide.spacing)).toBe(false)

    // Now the gap is 1 from 20 and c's left edge 3 away: the alignment guide goes.
    const spaced = resolveObjectPixelSnap(
      MOVING,
      { x: 121, y: 0, width: 33, height: 40 },
      nodes,
      snappingEditor(),
      [],
      [],
      SPACING
    )
    expect(spaced.correction.x).toBe(-1)
    expect(spaced.guides.filter((guide) => guide.axis === 'x')).toEqual([])
    expect(spaced.guides.some((guide) => guide.spacing)).toBe(true)
  })

  test('an explicit guide wins over equal spacing', () => {
    const guide: ExplicitSnapTarget = {
      kind: 'canvas-guide',
      axis: 'x',
      position: 124,
      from: -1000,
      to: 1000
    }
    const result = resolveObjectPixelSnap(
      MOVING,
      { x: 122, y: 0, width: 40, height: 40 },
      ROW,
      snappingEditor(),
      [guide],
      [],
      SPACING
    )
    expect(result.correction.x).toBe(2)
    expect(result.guides.some((candidate) => candidate.spacing)).toBe(false)
  })

  test('centres a layer between two neighbours', () => {
    const result = resolveObjectPixelSnap(
      MOVING,
      { x: 68, y: 0, width: 40, height: 40 },
      [box('a', 0, 0), box('b', 140, 0)],
      snappingEditor(),
      [],
      [],
      SPACING
    )
    expect(result.correction.x).toBe(2)
    expect(result.guides.filter((guide) => guide.spacing)).toHaveLength(2)
  })

  test('ignores a gap across a label sitting over its button', () => {
    // Buttons r1 and r2 are 20 apart; t1 ends at 80 but r1 covers it up to 100.
    const buttons = [
      box('r1', 0, 0, 100, 40),
      box('t1', 20, 10, 60, 20),
      box('r2', 120, 0, 100, 40),
      box('t2', 140, 10, 60, 20)
    ]
    const result = resolveObjectPixelSnap(
      MOVING,
      { x: 258, y: 0, width: 100, height: 40 },
      buttons,
      snappingEditor(),
      [],
      [],
      SPACING
    )
    expect(result.correction.x).toBe(0)
    expect(result.guides.some((guide) => guide.spacing)).toBe(false)
  })
})
