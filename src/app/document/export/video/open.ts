import { ref, type Ref } from 'vue'

import type { EditorStore } from '@/app/editor/active-store'

const openStates = new WeakMap<EditorStore, Ref<boolean>>()

/** Whether a document's Export prototype as video dialog is open. */
export function videoExportOpen(store: EditorStore): Ref<boolean> {
  let open = openStates.get(store)
  if (!open) {
    open = ref(false)
    openStates.set(store, open)
  }
  return open
}

/** Opens the Export prototype as video dialog, as File › Export and the Prototype panel do. */
export function openVideoExport(store: EditorStore): void {
  videoExportOpen(store).value = true
}
