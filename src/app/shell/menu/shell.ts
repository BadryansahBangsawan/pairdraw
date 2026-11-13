import { watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { openTour } from '@/app/demo/document'
import { requestAppExit } from '@/app/document/close/exit'
import { openSettingsDialog } from '@/app/settings/dialog'
import { setDesignIssuesOnCanvas, setSnappingPreference } from '@/app/settings/preferences/apply'
import {
  syncNativeCommentsMenu,
  syncNativeDesignIssuesMenu,
  syncNativeSidePanelsMenu,
  syncNativeSnappingMenu
} from '@/app/settings/preferences/native-menu'
import { appPreferences } from '@/app/settings/preferences/store'
import { openShortcutSheet } from '@/app/shell/keyboard/sheet'
import { useNativeMenuEvents } from '@/app/shell/menu/native-events'
import { APP_MENU_SCHEMA, type AppMenuEntry } from '@/app/shell/menu/schema'
import {
  layersPanelOpen,
  propertiesPanelOpen,
  toggleLayersPanel,
  togglePropertiesPanel
} from '@/app/shell/side-panels'
import { useAppTheme } from '@/app/shell/theme'
import { checkForAppUpdate } from '@/app/shell/updater/check'
import { isTauri } from '@/app/tauri/env'
import { openEditorWindow } from '@/app/window/open'

function shellMenuIds(entries: readonly AppMenuEntry[]): string[] {
  return entries.flatMap((entry) => {
    if (entry.type === 'separator') return []
    return [...(entry.handler === 'shell' ? [entry.id] : []), ...shellMenuIds(entry.sub ?? [])]
  })
}

export const SHELL_MENU_IDS = new Set([
  ...APP_MENU_SCHEMA.flatMap((group) => shellMenuIds(group.items)),
  // The macOS application menu is native-only; its custom entries come from
  // APP_MENU_APP_ITEMS while the OS-predefined ones stay in Rust.
  'check-updates',
  'quit'
])

export function useShellMenu() {
  if (!isTauri()) return

  void syncNativeSnappingMenu(appPreferences.value.editing.snapping).catch((error: unknown) => {
    console.error('[Menu] Failed to synchronize native snapping preferences:', error)
  })
  void syncNativeDesignIssuesMenu(appPreferences.value.designCheck.showOnCanvas).catch(
    (error: unknown) => {
      console.error('[Menu] Failed to synchronize the native design issues menu:', error)
    }
  )

  void syncNativeCommentsMenu(appPreferences.value.comments.showOnCanvas).catch(
    (error: unknown) => {
      console.error('[Menu] Failed to synchronize the native comments menu:', error)
    }
  )

  // The top bar's buttons open and close the panels too, so the menu follows the preference.
  watch(
    [layersPanelOpen, propertiesPanelOpen],
    ([layers, properties]) => {
      void syncNativeSidePanelsMenu(layers, properties).catch((error: unknown) => {
        console.error('[Menu] Failed to synchronize the native panel menu:', error)
      })
    },
    { immediate: true }
  )

  const { setTheme } = useAppTheme()
  const { updates } = useI18n()
  const actions: Partial<Record<string, () => void>> = {
    'new-window': () => {
      void openEditorWindow().catch((error: unknown) => {
        console.error('[Window] Failed to open a new window:', error)
      })
    },
    'open-tour': () => {
      openTour().catch((error: unknown) => console.error('[Tour] Could not open the tour:', error))
    },
    settings: openSettingsDialog,
    diagnostics: () => openSettingsDialog('diagnostics'),
    'snap-geometry': () => {
      const current = appPreferences.value.editing.snapping.geometry
      setSnappingPreference('geometry', !current)
    },
    'snap-objects': () => {
      const current = appPreferences.value.editing.snapping.objects
      setSnappingPreference('objects', !current)
    },
    'snap-pixel-grid': () => {
      const current = appPreferences.value.editing.snapping.pixelGrid
      setSnappingPreference('pixelGrid', !current)
    },
    'view-design-issues': () =>
      setDesignIssuesOnCanvas(!appPreferences.value.designCheck.showOnCanvas),
    'view-layers-panel': toggleLayersPanel,
    'view-properties-panel': togglePropertiesPanel,
    'keyboard-shortcuts': openShortcutSheet,
    'theme-light': () => setTheme('light'),
    'theme-dark': () => setTheme('dark'),
    'theme-auto': () => setTheme('auto'),
    'check-updates': () => void checkForAppUpdate({ messages: updates }),
    quit: () => void requestAppExit()
  }

  useNativeMenuEvents((id) => actions[id]?.())
}
