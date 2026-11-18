import { afterEach, beforeEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { appPreferences } from '@/app/settings/preferences/store'
import {
  designPanelOpen,
  layersPanelOpen,
  leftPanelView,
  showDesignPanel,
  toggleDesignPanel
} from '@/app/shell/side-panels'

let stored: typeof appPreferences.value

beforeEach(() => {
  stored = structuredClone(toRaw(appPreferences.value))
  layersPanelOpen.value = false
  leftPanelView.value = 'file'
})

afterEach(() => {
  appPreferences.value = stored
  leftPanelView.value = 'file'
})

test('the design view opens the sidebar on its tab, and the same shortcut closes it', () => {
  toggleDesignPanel()

  expect(designPanelOpen.value).toBe(true)
  // The sidebar is open where the person left it for the next start.
  expect(appPreferences.value.workspace.layersOpen).toBe(true)

  toggleDesignPanel()

  expect(layersPanelOpen.value).toBe(false)
  // The view itself stays chosen, so reopening the sidebar returns to it.
  expect(String(leftPanelView.value)).toBe('design')
})

test('showing the design view switches a sidebar that is already open', () => {
  layersPanelOpen.value = true
  leftPanelView.value = 'assets'

  showDesignPanel()

  expect(layersPanelOpen.value).toBe(true)
  expect(String(leftPanelView.value)).toBe('design')
})

test('the design view is showing only while the sidebar is open on it', () => {
  showDesignPanel()
  expect(designPanelOpen.value).toBe(true)

  layersPanelOpen.value = false
  expect(designPanelOpen.value).toBe(false)

  leftPanelView.value = 'slides'
  layersPanelOpen.value = true
  expect(designPanelOpen.value).toBe(false)
})

test('the view is not a preference: only the open sidebar is kept', () => {
  leftPanelView.value = 'design'
  layersPanelOpen.value = true

  expect('propertiesOpen' in appPreferences.value.workspace).toBe(false)
  expect(Object.keys(appPreferences.value.workspace)).toEqual(['layersOpen'])
})
