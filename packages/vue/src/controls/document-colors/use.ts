import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'

import { documentColors, type DocumentColor, type Editor } from '@pairdraw/core'
import type { DocumentColorSpace } from '@pairdraw/scene-graph'

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

/**
 * The profile the document stores its colors in, so a preview can draw the color the canvas draws.
 * Follows the injected editor's document and falls back to sRGB outside an editor subtree.
 */
export function useDocumentColorSpace(): ComputedRef<DocumentColorSpace> {
  const editor = injectEditor()
  return computed(() => editor?.graph.documentColorSpace ?? 'srgb')
}

/** The injected editor, or null when the holder is not an editor subtree. */
function injectEditor(): Editor | null {
  const editor = inject(EDITOR_KEY, null)
  return editor ?? null
}
