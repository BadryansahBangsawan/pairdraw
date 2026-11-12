/**
 * The document-level wiring an editor store installs once: the color space mirrored into app
 * state, and script nodes run again when they change. Both are taken down with the store.
 */
import type { Editor } from '@open-pencil/core'

import { installScriptLiveRuns } from '@/app/code/script/live'
import type { AppEditorState } from '@/app/editor/session/types'

export interface DocumentWiring {
  /** Puts back the color space an undo or a load changed, under the new one. */
  stopColorSpaceSync: () => void
  /** A script node runs again when it is resized or its inputs change, without a Run click. */
  stopScriptLiveRuns: () => void
}

/**
 * Watches the document for the two things a store follows. The script runs need a browser frame
 * to draw in, so a headless store, such as a unit test's, never starts one.
 */
export function installDocumentWiring(editor: Editor, state: AppEditorState): DocumentWiring {
  const syncDocumentColorSpace = () => {
    state.documentColorSpace = editor.graph.documentColorSpace
  }
  syncDocumentColorSpace()
  const stopColorSpaceSync = editor.onEditorEvent(
    'document:color-space-changed',
    syncDocumentColorSpace
  )
  editor.onEditorEvent('graph:replaced', syncDocumentColorSpace)

  const stopScriptLiveRuns = installScriptLiveRuns({
    graph: editor.graph,
    currentPageId: () => state.currentPageId,
    onEditorEvent: editor.onEditorEvent
  })
  return { stopColorSpaceSync, stopScriptLiveRuns }
}
