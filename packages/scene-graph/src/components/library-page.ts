import { LIBRARY_DEFINITIONS_PAGE_NAME } from '../constants'
import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'

/**
 * The hidden page a document keeps the library components it uses on, created hidden, locked, and
 * internal the first time a library component joins the document.
 */
export function libraryDefinitionsPage(graph: SceneGraph): SceneNode {
  const existing = graph
    .getPages(true)
    .find((page) => page.internalOnly && page.name === LIBRARY_DEFINITIONS_PAGE_NAME)
  if (existing) return existing
  const page = graph.addPage(LIBRARY_DEFINITIONS_PAGE_NAME)
  graph.updateNode(page.id, { internalOnly: true, visible: false, locked: true })
  return graph.getNode(page.id) ?? page
}
