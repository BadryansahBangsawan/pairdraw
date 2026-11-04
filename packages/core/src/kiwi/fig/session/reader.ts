import { createFigDocumentSession, type FigDocumentFont } from '@open-pencil/fig'
import type { FigPageManifestEntry } from '@open-pencil/kiwi/fig'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { buildFigPopulationDelta, installFigMutationJournal } from '#core/kiwi/fig/population/delta'
import { readerSessionOptions, type FigReaderDiagnostic } from '#core/kiwi/fig/session/options'
import { registerDocumentFonts } from '#core/text/font/document'

/**
 * Registers the archive's document fonts for its graph. No-op when the archive stores none.
 */
async function registerReaderFonts(session: {
  graph: SceneGraph
  fonts: FigDocumentFont[]
}): Promise<void> {
  if (session.fonts.length === 0) return
  await registerDocumentFonts(
    session.graph,
    session.fonts.map(({ family, style, data }) => ({
      family,
      style,
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    }))
  )
}

/** Worker and main-thread transport for the .fig reader session for the FIG reader session. */
export function openReaderSession(
  bytes: ArrayBuffer,
  populate: 'all' | 'first-page' | 'none' = 'all'
) {
  const diagnostics: FigReaderDiagnostic[] = []
  const session = createFigDocumentSession(bytes, readerSessionOptions(diagnostics))
  const pages: FigPageManifestEntry[] = session.pages.map((page) => ({
    sourceId: page.id,
    name: page.name,
    position: page.position,
    internalOnly: page.internalOnly
  }))
  const sourceByGraph = new Map<string, string>()
  for (const page of session.pages) {
    const id = session.graphPageId(page.id)
    if (id) sourceByGraph.set(id, page.id)
  }
  const loadedGraphIds = () =>
    [...session.loadedPageIds].flatMap((id) => {
      const graphId = session.graphPageId(id)
      return graphId ? [graphId] : []
    })
  if (populate === 'all') {
    for (const page of pages) if (!page.internalOnly) session.loadPage(page.sourceId)
  } else if (populate === 'first-page') {
    const page = pages.find((page) => !page.internalOnly)
    if (page) session.loadPage(page.sourceId)
  }
  return {
    session,
    /**
     * Registers the archive's document fonts for the graph, so its text draws in them.
     * Async because font bytes are validated on registration.
     */
    registerDocumentFonts: () => registerReaderFonts(session),
    /** Records skipped so far, including those of pages loaded later. */
    diagnostics,
    checkpoint: () => session.checkpoint(),
    graph: session.graph,
    pages,
    populate(pageId: string, onProgress?: () => void) {
      const sourceId = sourceByGraph.get(pageId)
      if (!sourceId) throw new Error(`Unknown graph page ${pageId}`)
      const populated = !session.loadedPageIds.has(sourceId)
      const journal = installFigMutationJournal(session.graph)
      try {
        session.loadPage(sourceId, onProgress)
        onProgress?.()
        return {
          checkpoint: session.checkpoint(),
          populated,
          delta: buildFigPopulationDelta(session.graph, journal, loadedGraphIds())
        }
      } finally {
        journal.stop()
      }
    }
  }
}
