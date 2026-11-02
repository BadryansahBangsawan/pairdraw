import type { Editor } from '@open-pencil/core'

/** Figma's Remove auto layout key, which acts on every selected frame at once. */
export const REMOVE_AUTO_LAYOUT_SHORTCUT = 'SHIFT+ALT+A'

/**
 * Turns auto layout off on every selected layer that has it, in one undo step; layers without
 * auto layout are left as they are. Returns how many layers changed.
 */
export function removeSelectionAutoLayout(
  editor: Pick<Editor, 'graph' | 'state' | 'undo' | 'setLayoutMode'>
): number {
  const ids = [...editor.state.selectedIds].filter((id) => {
    const node = editor.graph.getNode(id)
    return node !== undefined && node.layoutMode !== 'NONE'
  })
  if (ids.length === 0) return 0
  editor.undo.runBatch('Remove auto layout', () => {
    for (const id of ids) editor.setLayoutMode(id, 'NONE')
  })
  return ids.length
}
