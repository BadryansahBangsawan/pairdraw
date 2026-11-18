import { afterEach, beforeEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { createDefaultEditorState, type CanvasView } from '@pairdraw/core'

import { appPreferences, updateNudgePreferences } from '@/app/settings/preferences/store'
import { nudgeDistance, nudgeForKey } from '@/app/shell/keyboard/nudging'

let stored: typeof appPreferences.value

beforeEach(() => {
  stored = structuredClone(toRaw(appPreferences.value))
})

afterEach(() => {
  appPreferences.value = stored
})

test('nudges 1 px, or 10 px with Shift, until Settings changes them', () => {
  updateNudgePreferences({ small: 1, large: 10 })
  expect(nudgeDistance(false)).toBe(1)
  expect(nudgeDistance(true)).toBe(10)
})

test('follows the nudge distances set in Settings', () => {
  updateNudgePreferences({ small: 0.5 })
  updateNudgePreferences({ large: 8 })
  expect(appPreferences.value.editing.nudge).toEqual({ small: 0.5, large: 8 })
  expect(nudgeDistance(false)).toBe(0.5)
  expect(nudgeDistance(true)).toBe(8)
})

test('reads given distances without the stored ones', () => {
  expect(nudgeDistance(true, { small: 2, large: 16 })).toBe(16)
})

/** An editor's state with one layer selected, on the canvas's `view`. */
function selectedOn(view: CanvasView) {
  const state = createDefaultEditorState('page')
  state.selectedIds = new Set(['layer'])
  state.canvasView = view
  return state
}

function arrow(code: string, shiftKey = false) {
  return { code, shiftKey, metaKey: false, ctrlKey: false, altKey: false }
}

const NUDGE = { small: 1, large: 10 }

test('an arrow key nudges the selection while editing', () => {
  const state = selectedOn({ id: 'edit' })
  expect(nudgeForKey(state, arrow('ArrowRight'), NUDGE)).toEqual([1, 0])
  expect(nudgeForKey(state, arrow('ArrowUp', true), NUDGE)).toEqual([0, -10])
  expect(nudgeForKey(state, { ...arrow('ArrowLeft'), metaKey: true }, NUDGE)).toBeNull()
})

test('a view that runs only its own keys, as Shader Mode does, moves no layer', () => {
  const shader = selectedOn({ id: 'shader', nodeId: 'layer', image: 'still' })
  for (const code of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) {
    expect(nudgeForKey(shader, arrow(code), NUDGE)).toBeNull()
    expect(nudgeForKey(shader, arrow(code, true), NUDGE)).toBeNull()
  }
  expect(
    nudgeForKey(
      selectedOn({ id: 'play', revision: 0, returnTo: { panX: 0, panY: 0, zoom: 1 } }),
      arrow('ArrowDown'),
      NUDGE
    )
  ).toBeNull()
})
