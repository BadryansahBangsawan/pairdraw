import { afterEach, beforeEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { appPreferences, updateNudgePreferences } from '@/app/settings/preferences/store'
import { nudgeDistance } from '@/app/shell/keyboard/nudging'

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
