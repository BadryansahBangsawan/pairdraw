import { describe, expect, test } from 'bun:test'

import type { NodeEditOverlayState } from '#core/canvas/node-edit-overlay'
import { nodeEditTransformBoxCorners } from '#core/canvas/node-edit/transform-box'

const zero = { x: 0, y: 0 }

/** An open path (0,0) → (100,0) → (100,100) with its two ends selected. */
function state(overrides: Partial<NodeEditOverlayState> = {}): NodeEditOverlayState {
  return {
    nodeId: 'path',
    vertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ],
    segments: [
      { start: 0, end: 1, tangentStart: zero, tangentEnd: zero },
      { start: 1, end: 2, tangentStart: zero, tangentEnd: zero }
    ],
    regions: [],
    selectedVertexIndices: new Set([0, 2]),
    ...overrides
  }
}

describe('the transform box around selected points', () => {
  test('surrounds two selected points while Select handles presses', () => {
    expect(nodeEditTransformBoxCorners(state(), 1)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ])
    expect(nodeEditTransformBoxCorners(state({ pointsTransformable: true }), 1)).not.toBeNull()
  })

  test('is hidden for a lone point, the cut tool, and tools other than Select', () => {
    expect(
      nodeEditTransformBoxCorners(state({ selectedVertexIndices: new Set([0]) }), 1)
    ).toBeNull()
    expect(nodeEditTransformBoxCorners(state({ cutTool: true }), 1)).toBeNull()
    expect(nodeEditTransformBoxCorners(state({ pointsTransformable: false }), 1)).toBeNull()
  })
})
