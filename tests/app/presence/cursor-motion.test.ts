import { describe, expect, test } from 'bun:test'

import { createEditorStore } from '@/app/editor/session/create'
import { showCursors, toggleRemoteCursors, type TrackedCursor } from '@/app/presence/cursor-motion'

const AGENT: TrackedCursor = {
  id: 'agent-1',
  kind: 'agent',
  name: 'Agent',
  color: { r: 0.5, g: 0.3, b: 1, a: 1 },
  x: 40,
  y: 60
}

describe('multiplayer cursors', () => {
  test('hiding them clears the drawn cursors, and showing them brings them back in place', () => {
    const store = createEditorStore()
    showCursors(store, [AGENT])
    expect(store.state.presenceCursors.map((cursor) => cursor.name)).toEqual(['Agent'])

    toggleRemoteCursors(store)
    expect(store.state.showRemoteCursors).toBe(false)
    expect(store.state.presenceCursors).toEqual([])

    // Updates while hidden keep them hidden.
    showCursors(store, [{ ...AGENT, x: 80 }])
    expect(store.state.presenceCursors).toEqual([])

    toggleRemoteCursors(store)
    expect(store.state.presenceCursors.map(({ x, y }) => ({ x, y }))).toEqual([{ x: 80, y: 60 }])
  })
})
