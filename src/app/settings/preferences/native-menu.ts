import type { SnappingPreferences } from '@pairdraw/core'

import { isTauri } from '@/app/tauri/env'

export const DESIGN_ISSUES_MENU_ID = 'view-design-issues'
export const COMMENTS_MENU_ID = 'view-comments'
export const LAYERS_PANEL_MENU_ID = 'view-layers-panel'
export const PROPERTIES_PANEL_MENU_ID = 'view-properties-panel'

/** The snapping choices the native View menu checks; half-pixel snapping lives in Settings. */
type NativeSnappingPreference = Exclude<keyof SnappingPreferences, 'halfPixel'>

const SNAPPING_MENU_IDS = {
  geometry: 'snap-geometry',
  objects: 'snap-objects',
  pixelGrid: 'snap-pixel-grid'
} satisfies Record<NativeSnappingPreference, string>

export async function syncNativeSnappingMenu(preferences: SnappingPreferences): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await Promise.all(
    Object.entries(SNAPPING_MENU_IDS).map(([preference, id]) =>
      invoke('set_native_menu_checked', {
        id,
        checked: preferences[preference as NativeSnappingPreference]
      })
    )
  )
}

export async function syncNativeDesignIssuesMenu(showOnCanvas: boolean): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('set_native_menu_checked', { id: DESIGN_ISSUES_MENU_ID, checked: showOnCanvas })
}

/** View → Comments, which Shift+C and the comment menus also toggle. */
export async function syncNativeCommentsMenu(shown: boolean): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('set_native_menu_checked', { id: COMMENTS_MENU_ID, checked: shown })
}

/** View → Layers panel and View → Properties panel, which the top bar's buttons also toggle. */
export async function syncNativeSidePanelsMenu(
  layers: boolean,
  properties: boolean
): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await Promise.all([
    invoke('set_native_menu_checked', { id: LAYERS_PANEL_MENU_ID, checked: layers }),
    invoke('set_native_menu_checked', { id: PROPERTIES_PANEL_MENU_ID, checked: properties })
  ])
}
