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

test('comments or history open a closed properties panel and close it again afterwards', async () => {
  propertiesPanelOpen.value = false
  const commenting = ref(false)
  const run = watchSidebar(() => commenting.value)

  commenting.value = true
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(true)
  expect(appPreferences.value.workspace.propertiesOpen).toBe(true)

  commenting.value = false
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(false)
  run.stop()
})

test('a panel that was already open stays open when comments end', async () => {
  propertiesPanelOpen.value = true
  const commenting = ref(false)
  const run = watchSidebar(() => commenting.value)

  commenting.value = true
  await nextTick()
  commenting.value = false
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(true)
  run.stop()
})

test('a panel closed by hand while commenting is left closed', async () => {
  propertiesPanelOpen.value = false
  const commenting = ref(false)
  const run = watchSidebar(() => commenting.value)

  commenting.value = true
  await nextTick()
  propertiesPanelOpen.value = false
  await nextTick()
  // Reopening it by hand afterwards keeps it open once comments end.
  propertiesPanelOpen.value = true
  await nextTick()
  commenting.value = false
  await nextTick()
  expect(propertiesPanelOpen.value).toBe(true)
  run.stop()
})

test('opens at once when comments are already showing', () => {
  propertiesPanelOpen.value = false
  const run = watchSidebar(() => true)
  expect(propertiesPanelOpen.value).toBe(true)
  run.stop()
})
