import { computed, watch } from 'vue'

import { appPreferences, updateWorkspacePreferences } from '@/app/settings/preferences/store'

/**
 * Whether the desktop editor shows its layers panel. Closing it gives the canvas its width; it
 * stays as the person left it across documents and sessions.
 */
export const layersPanelOpen = computed({
  get: () => appPreferences.value.workspace.layersOpen,
  set: (layersOpen: boolean) => {
    if (appPreferences.value.workspace.layersOpen === layersOpen) return
    updateWorkspacePreferences({ layersOpen })
  }
})

/** Whether the desktop editor shows its properties panel, kept like {@link layersPanelOpen}. */
export const propertiesPanelOpen = computed({
  get: () => appPreferences.value.workspace.propertiesOpen,
  set: (propertiesOpen: boolean) => {
    if (appPreferences.value.workspace.propertiesOpen === propertiesOpen) return
    updateWorkspacePreferences({ propertiesOpen })
  }
})

export function toggleLayersPanel(): void {
  layersPanelOpen.value = !layersPanelOpen.value
}

export function togglePropertiesPanel(): void {
  propertiesPanelOpen.value = !propertiesPanelOpen.value
}

/**
 * Opens the properties panel while `needed` holds, for what shows in its place, such as the
 * comments list or version history, and closes it again afterwards when it was opened only for
 * that. Closing it by hand meanwhile is left alone. Call it from a component's setup.
 */
export function openPropertiesPanelWhile(needed: () => boolean): void {
  let openedForIt = false
  watch(
    needed,
    (now) => {
      if (now && !propertiesPanelOpen.value) {
        openedForIt = true
        propertiesPanelOpen.value = true
      } else if (!now && openedForIt) {
        openedForIt = false
        propertiesPanelOpen.value = false
      }
    },
    { immediate: true }
  )
  watch(propertiesPanelOpen, (open) => {
    if (!open) openedForIt = false
  })
}
