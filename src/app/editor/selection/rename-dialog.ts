import type { EditorStore } from '@/app/editor/active-store'
import { layersPanelOpen, leftPanelView, showDesignPanel } from '@/app/shell/side-panels'

export function requestRenameSelection(store: EditorStore): void {
  const selectedIds = [...store.state.selectedIds]
  if (selectedIds.length === 0) return
  if (selectedIds.length === 1) {
    // ⌘R renames where the user can see it: the Layers view renames its row, any other sidebar
    // state shows the design panel, whose heading renames in place.
    if (!layersPanelOpen.value || leftPanelView.value !== 'file') showDesignPanel()
    store.state.renameNodeId = selectedIds[0]
    return
  }
  store.state.renameSelectionOpen = true
}
