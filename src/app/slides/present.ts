import { slidesMessages } from '@pairdraw/vue/i18n'

import type { EditorStore } from '@/app/editor/active-store'
import { exportLayersToPDF } from '@/app/shell/menu/actions/pdf'
import { toast } from '@/app/shell/ui'

import { rememberPresentationOrigin } from './focus'

/**
 * Presents the page's slides, from `slideId` or the slide holding the selection; a page without
 * top-level frames says how to make one instead. Focus goes back to the control that started it
 * once it ends.
 */
export function startPresentation(store: EditorStore, slideId?: string): boolean {
  rememberPresentationOrigin(store)
  if (store.startPresentation(slideId)) return true
  toast.info(slidesMessages.get().nothingToPresent)
  return false
}

/** Present, or leave the presentation: ⌘↩ and View › Present. */
export function togglePresentation(store: EditorStore): void {
  if (store.getPresentation()) store.stopPresentation()
  else startPresentation(store)
}

/** Saves every slide of the page as one PDF, a page per slide in slide order. */
export function exportSlidesToPDF(store: EditorStore): Promise<void> {
  return exportLayersToPDF(
    store,
    store.getSlides().map((slide) => slide.id)
  )
}

/**
 * Saves every slide of the page as one PowerPoint deck, a slide per slide in slide order, the
 * order Present shows them in; a page without slides saves nothing.
 */
export async function exportSlidesToPPTX(store: EditorStore): Promise<void> {
  const ids = store.getSlides().map((slide) => slide.id)
  if (ids.length === 0) return
  try {
    await store.exportTarget({ scope: 'selection', nodeIds: ids }, 'pptx')
  } catch (error) {
    console.error('[Export] Could not export the slides:', error)
    const detail = error instanceof Error ? error.message : String(error)
    toast.error(slidesMessages.get().exportPPTXFailed({ error: detail }))
  }
}
