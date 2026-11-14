import { pageSlides } from '@pairdraw/core'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { exportErrorDetail } from '@/app/document/export/errors'
import type { EditorStore } from '@/app/editor/active-store'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

/**
 * The layers Export frames to PDF puts on its pages, one page each, in the page's layer order:
 * the selected layers, or every visible top-level frame of the page (including frames in its
 * sections) when nothing is selected. Loose shapes, text, and groups are left out of the page's
 * frames, as in Figma. A nested layer sorts by the top-level layer it is in.
 */
export function pdfFrameIds(
  graph: SceneGraph,
  pageId: string,
  selectedIds: Iterable<string>
): string[] {
  const page = graph.getNode(pageId)
  if (!page) return []
  const selected = [...selectedIds]
  if (selected.length === 0) return pageSlides(graph, pageId).map((slide) => slide.id)
  const ranks = new Map(
    selected.map((id) => {
      const topLevel = graph.closest(id, (node) => node.parentId === pageId)
      return [id, topLevel ? page.childIds.indexOf(topLevel.id) : -1]
    })
  )
  const rank = (id: string) => ranks.get(id) ?? -1
  return selected.filter((id) => rank(id) !== -1).toSorted((a, b) => rank(a) - rank(b))
}

/**
 * Saves the current page's frames, or the selected ones, as one PDF with a page per frame, each
 * sized to its frame, as Figma's File › Export frames to PDF… does.
 */
export async function exportFramesToPDF(store: EditorStore): Promise<void> {
  await exportLayersToPDF(
    store,
    pdfFrameIds(store.graph, store.state.currentPageId, store.state.selectedIds)
  )
}

/** Saves the layers as one PDF, a page per layer in the order given, each sized to its layer. */
export async function exportLayersToPDF(store: EditorStore, ids: string[]): Promise<void> {
  const messages = notificationMessages.get()
  if (ids.length === 0) {
    toast.info(messages.exportPDFEmpty)
    return
  }
  try {
    await store.exportTarget({ scope: 'selection', nodeIds: ids }, 'pdf')
  } catch (error) {
    console.error('[Export] Could not export the PDF:', error)
    toast.error(messages.exportPDFFailed({ error: exportErrorDetail(error) }))
  }
}
