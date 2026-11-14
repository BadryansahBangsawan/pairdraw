import { computed, ref, watch } from 'vue'

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

/**
 * The properties panel showing for what needs it rather than by the person's choice. It is not
 * kept, so the panel a selection opened is closed again the next time the app starts.
 */
const propertiesPanelHeld = ref(false)

/**
 * Whether the desktop editor shows its properties panel: kept open by the person, like
 * {@link layersPanelOpen}, or held open by {@link openPropertiesPanelWhile}. Setting it is the
 * person's choice, which ends a hold.
 */
export const propertiesPanelOpen = computed({
  get: () => appPreferences.value.workspace.propertiesOpen || propertiesPanelHeld.value,
  set: (propertiesOpen: boolean) => {
    propertiesPanelHeld.value = false
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
 * Opens the properties panel while `needed` holds, for a selection to edit or what shows in the
 * panel's place, such as the comments list or version history, and closes it again afterwards when
 * it was opened only for that. Closing it by hand meanwhile is left alone until the next need. One
 * caller owns the hold, so call it once from the workspace's setup.
 */
export function openPropertiesPanelWhile(needed: () => boolean): void {
  watch(
    needed,
    (now) => {
      propertiesPanelHeld.value = now && !appPreferences.value.workspace.propertiesOpen
    },
    { immediate: true }
  )
}
