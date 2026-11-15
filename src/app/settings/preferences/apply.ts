import type { SnappingPreferences } from '@pairdraw/core'

import type { EditorStore } from '@/app/editor/active-store'
import { getTabsSnapshot } from '@/app/tabs'

import { syncNativeCommentsMenu, syncNativeSnappingMenu } from './native-menu'
import {
  appPreferences,
  updateCommentPreferences,
  updateDesignCheckPreferences,
  updateSnappingPreferences,
  updateViewPreferences,
  type DesignCheckPreset
} from './store'

export function setSnappingPreference(
  preference: keyof SnappingPreferences,
  enabled: boolean
): void {
  applySnappingPreferences({ [preference]: enabled })
}

/** Stores snapping changes and pushes them to every open editor and the native menu. */
export function applySnappingPreferences(changes: Partial<SnappingPreferences>): void {
  updateSnappingPreferences(changes)
  const snapping = appPreferences.value.editing.snapping
  for (const tab of getTabsSnapshot()) {
    tab.store.state.snappingPreferences = { ...snapping }
  }
  void syncNativeSnappingMenu(snapping).catch((error: unknown) => {
    console.error('[Settings] Failed to synchronize native snapping preferences:', error)
  })
}

/** View → Pixel grid: kept for the next session and shown or hidden in every open editor. */
export function setPixelGridShown(shown: boolean): void {
  updateViewPreferences({ pixelGrid: shown })
  for (const tab of getTabsSnapshot()) {
    tab.store.state.showPixelGrid = shown
    tab.store.requestRepaint()
  }
}

/** Shift+', View → Pixel grid, and the zoom menu: the opposite of what `store` shows now. */
export function togglePixelGrid(store: EditorStore): void {
  setPixelGridShown(store.state.showPixelGrid === false)
}

export function setDesignCheckPreset(preset: DesignCheckPreset): void {
  updateDesignCheckPreferences({ preset })
}

export function turnOffDesignCheckRule(ruleId: string): void {
  const disabledRules = new Set(appPreferences.value.designCheck.disabledRules)
  disabledRules.add(ruleId)
  updateDesignCheckPreferences({ disabledRules: [...disabledRules] })
}

export function turnOnDesignCheckRules(): void {
  updateDesignCheckPreferences({ disabledRules: [] })
}

/** View → Comments: pins outside the Comment tool, here and in the native menu. */
export function setCommentsOnCanvas(showOnCanvas: boolean): void {
  updateCommentPreferences({ showOnCanvas })
  void syncNativeCommentsMenu(showOnCanvas).catch((error: unknown) => {
    console.error('[Settings] Failed to synchronize the native comments menu:', error)
  })
}
