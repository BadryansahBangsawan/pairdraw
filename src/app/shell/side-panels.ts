import { computed, ref } from 'vue'

import { appPreferences, updateWorkspacePreferences } from '@/app/settings/preferences/store'

/** What the left sidebar shows: the layers tree, assets, slides, or the design (properties) view. */
export type LeftPanelView = 'file' | 'assets' | 'slides' | 'design'

/**
 * Which view the left sidebar shows. It lives here rather than in the panel, so the View menu and
 * a tool can change it, and it stays as the person left it while they move between documents.
 */
export const leftPanelView = ref<LeftPanelView>('file')

/**
 * Whether the desktop editor shows its left sidebar. Closing it gives the canvas its width; it
 * stays as the person left it across documents and sessions.
 */
export const layersPanelOpen = computed({
  get: () => appPreferences.value.workspace.layersOpen,
  set: (layersOpen: boolean) => {
    if (appPreferences.value.workspace.layersOpen === layersOpen) return
    updateWorkspacePreferences({ layersOpen })
  }
})

/** Whether the design view is the one showing, which the View menu checks and the shortcut toggles. */
export const designPanelOpen = computed(
  () => layersPanelOpen.value && leftPanelView.value === 'design'
)

export function toggleLayersPanel(): void {
  layersPanelOpen.value = !layersPanelOpen.value
}

/**
 * Shows the design view in the left sidebar, opening the sidebar if it was closed. Nothing calls
 * it for a selection: the panel follows the selection once it is showing, but never opens itself.
 */
export function showDesignPanel(): void {
  layersPanelOpen.value = true
  leftPanelView.value = 'design'
}

/** View → Design panel: shows it, or closes the sidebar when it is already the view showing. */
export function toggleDesignPanel(): void {
  if (designPanelOpen.value) layersPanelOpen.value = false
  else showDesignPanel()
}
