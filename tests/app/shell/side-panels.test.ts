import { afterEach, beforeEach, expect, test } from 'bun:test'

import { effectScope, nextTick, ref, toRaw } from 'vue'

import { appPreferences } from '@/app/settings/preferences/store'
import { openPropertiesPanelWhile, propertiesPanelOpen } from '@/app/shell/side-panels'

let stored: typeof appPreferences.value

beforeEach(() => {
  stored = structuredClone(toRaw(appPreferences.value))
})

afterEach(() => {
  appPreferences.value = stored
})

function watchSidebar(needed: () => boolean) {
  const run = effectScope()
  run.run(() => openPropertiesPanelWhile(needed))
  return run
}

test('a selection, comments or history open a closed properties panel and close it again afterwards', async () => {
  propertiesPanelOpen.value = false
  const needed = ref(false)
  const run = watchSidebar(() => needed.value)

  needed.value = true
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(true)
  // The panel is held open, not chosen: the next start does not find it open.
  expect(appPreferences.value.workspace.propertiesOpen).toBe(false)

  needed.value = false
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(false)
  run.stop()
})

test('a panel the person keeps open stays open when the need ends', async () => {
  propertiesPanelOpen.value = true
  const needed = ref(false)
  const run = watchSidebar(() => needed.value)

  needed.value = true
  await nextTick()
  needed.value = false
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(true)
  expect(appPreferences.value.workspace.propertiesOpen).toBe(true)
  run.stop()
})

test('a panel closed by hand while it is needed stays closed until the next need', async () => {
  propertiesPanelOpen.value = false
  const needed = ref(false)
  const run = watchSidebar(() => needed.value)

  needed.value = true
  await nextTick()
  propertiesPanelOpen.value = false
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(false)

  needed.value = false
  await nextTick()
  needed.value = true
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(true)
  run.stop()
})

test('a panel opened by hand while it is needed stays open once the need ends', async () => {
  propertiesPanelOpen.value = false
  const needed = ref(true)
  const run = watchSidebar(() => needed.value)

  propertiesPanelOpen.value = true
  await nextTick()
  needed.value = false
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(true)
  run.stop()
})

test('opens at once when it is already needed', () => {
  propertiesPanelOpen.value = false
  const run = watchSidebar(() => true)
  expect(propertiesPanelOpen.value).toBe(true)
  run.stop()
})
