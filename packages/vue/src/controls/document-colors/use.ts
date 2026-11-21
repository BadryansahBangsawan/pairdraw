import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'

import { documentColors, type DocumentColor, type Editor } from '@pairdraw/core'

import { EDITOR_KEY } from '#vue/editor/context'

/**
 * The solid colours the active page uses, most used first.
 *
 * Recomputed only when the scene or page changes (the dependency on `sceneVersion`), so an open
 * picker walks the tree once, not on every render. Outside an editor, such as a preference picker,
 * the list is empty.
 */
export function useDocumentColors(): ComputedRef<DocumentColor[]> {
  const editor = injectEditor()
  return computed(() => {
    if (!editor) return []
    void editor.state.sceneVersion
    return documentColors(editor.graph, editor.state.currentPageId)
  })
}

/** The injected editor, or null when the holder is not an editor subtree. */
function injectEditor(): Editor | null {
  const editor = inject(EDITOR_KEY, null)
  return editor ?? null
}
