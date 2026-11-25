import { describe, expect, test } from 'bun:test'

import { trackCanvasOrigin } from '@/app/editor/panes/origin'

// The call site's wiring is proven by tests/e2e/slides/presentation.spec.ts, which drives the
// editor canvas through a presentation and back; this module test pins the decision itself.
describe('canvas origin carry', () => {
  test('records the first mount without panning', () => {
    expect(trackCanvasOrigin('first', { x: 266, y: 44 })).toBeNull()
    expect(trackCanvasOrigin('first', { x: 266, y: 44 })).toBeNull()
  })

  test('pans by how far a remount moved the canvas', () => {
    trackCanvasOrigin('remount', { x: 266, y: 44 })

    expect(trackCanvasOrigin('remount', { x: 0, y: 0 })).toEqual({ dx: 266, dy: 44 })
    expect(trackCanvasOrigin('remount', { x: 266, y: 44 })).toEqual({ dx: -266, dy: -44 })
  })

  test('a presentation stage never moves the pane', () => {
    trackCanvasOrigin('presentation', { x: 266, y: 44 })

    expect(trackCanvasOrigin('presentation', { x: 0, y: 0 }, true)).toBeNull()
    // Leaving the presentation mounts the editor canvas where it was, so no shift is due.
    expect(trackCanvasOrigin('presentation', { x: 266, y: 44 })).toBeNull()
  })
})
