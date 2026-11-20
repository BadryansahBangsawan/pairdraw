import type { SnappingPreferences } from '@pairdraw/core'

import { watch, type Ref } from 'vue'

import { isTauri } from '@/app/tauri/env'

const COMMENTS_MENU_ID = 'view-comments'
const RULERS_MENU_ID = 'view-rulers'
const PIXEL_GRID_MENU_ID = 'view-pixel-grid'
const LAYERS_PANEL_MENU_ID = 'view-layers-panel'
const DESIGN_PANEL_MENU_ID = 'view-properties-panel'

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

/**
 * View → Rulers and View → Pixel Grid, which their keys and the zoom menu also toggle; on Linux
 * those keys never reach the native menu (`desktop/src/menu/mod.rs`), so it learns of them here.
 */
export async function syncNativeCanvasViewMenu(view: {
  rulers: boolean
  pixelGrid: boolean
}): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await Promise.all([
    invoke('set_native_menu_checked', { id: RULERS_MENU_ID, checked: view.rulers }),
    invoke('set_native_menu_checked', { id: PIXEL_GRID_MENU_ID, checked: view.pixelGrid })
  ])
}

/** What {@link followNativeCanvasViewMenu} reads of a document. */
interface CanvasViewSource {
  state: { showRulers: boolean; showPixelGrid?: boolean }
}

/**
 * Keeps View → Rulers and View → Pixel Grid checked as the active document shows them, whatever
 * toggled them and when another document becomes active. Each sync waits for the one before it,
 * so the menu ends on the latest state however its calls are answered.
 */
export function followNativeCanvasViewMenu(store: Ref<CanvasViewSource | undefined>): () => void {
  let pending: Promise<void> = Promise.resolve()
  return watch(
    () => {
      const state = store.value?.state
      return state ? { rulers: state.showRulers, pixelGrid: state.showPixelGrid !== false } : null
    },
    (view) => {
      if (!view) return
      pending = pending
        .then(() => syncNativeCanvasViewMenu(view))
        .catch((error: unknown) => {
          console.error('[Menu] Failed to synchronize the native rulers and pixel grid:', error)
        })
    },
    { immediate: true, deep: true }
  )
}

/** View → Comments, which Shift+C and the comment menus also toggle. */
export async function syncNativeCommentsMenu(shown: boolean): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('set_native_menu_checked', { id: COMMENTS_MENU_ID, checked: shown })
}

/** View → Layers panel and View → Design panel, which the left sidebar's tabs also switch. */
export async function syncNativeSidePanelsMenu(layers: boolean, design: boolean): Promise<void> {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await Promise.all([
    invoke('set_native_menu_checked', { id: LAYERS_PANEL_MENU_ID, checked: layers }),
    invoke('set_native_menu_checked', { id: DESIGN_PANEL_MENU_ID, checked: design })
  ])
}
