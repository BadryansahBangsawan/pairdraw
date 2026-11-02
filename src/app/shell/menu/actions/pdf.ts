import type { NodeType, SceneGraph } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

/** The layers Figma counts as frames for Export frames to PDF, as for N and Shift+N. */
const PDF_FRAME_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])

/** The visible top-level frames under a page or section, in layer order, with sections opened. */
function topLevelFrameIds(graph: SceneGraph, parentId: string): string[] {
  return graph.getChildren(parentId).flatMap((node) => {
    if (!node.visible) return []
    if (node.type === 'SECTION') return topLevelFrameIds(graph, node.id)
    return PDF_FRAME_TYPES.has(node.type) ? [node.id] : []
  })
}

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
  if (selected.length === 0) return topLevelFrameIds(graph, pageId)
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
  const messages = notificationMessages.get()
  const ids = pdfFrameIds(store.graph, store.state.currentPageId, store.state.selectedIds)
  if (ids.length === 0) {
    toast.info(messages.exportPDFEmpty)
    return
  }
  try {
    await store.exportTarget({ scope: 'selection', nodeIds: ids }, 'pdf')
  } catch (error) {
    console.error('[Export] Could not export the PDF:', error)
    const detail = error instanceof Error ? error.message : String(error)
    toast.error(messages.exportPDFFailed({ error: detail }))
  }
}
