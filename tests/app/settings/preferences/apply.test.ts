import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { setPixelGridShown, togglePixelGrid } from '@/app/settings/preferences/apply'
import { appPreferences } from '@/app/settings/preferences/store'
import { createTab } from '@/app/tabs'

let stored: typeof appPreferences.value

beforeEach(() => {
  stored = structuredClone(toRaw(appPreferences.value))
})

afterEach(() => {
  appPreferences.value = stored
})

test('the pixel grid shows or hides in every open document and stays so for new ones', () => {
  const first = createTab()
  const second = createTab()

  setPixelGridShown(false)
  expect(appPreferences.value.view.pixelGrid).toBe(false)
  expect(first.store.state.showPixelGrid).toBe(false)
  expect(second.store.state.showPixelGrid).toBe(false)
  expect(createTab().store.state.showPixelGrid).toBe(false)

  togglePixelGrid(first.store)
  expect(appPreferences.value.view.pixelGrid).toBe(true)
  expect(second.store.state.showPixelGrid).toBe(true)
  expect(createTab().store.state.showPixelGrid).toBe(true)
})
