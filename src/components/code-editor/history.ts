import { redo, undo } from '@codemirror/commands'
import { Prec, type Extension } from '@codemirror/state'
import { keymap, type KeyBinding } from '@codemirror/view'

import { EDITOR_COMMAND_METADATA } from '@pairdraw/vue/editor/commands'

/** The app's own shortcut for a command as a CodeMirror binding: `MOD+SHIFT+Z` → `Mod-Shift-z`. */
function commandBinding(id: 'edit.undo' | 'edit.redo', run: typeof undo): KeyBinding {
  const key = EDITOR_COMMAND_METADATA[id].shortcut
    .split('+')
    .map((part, index, all) =>
      index === all.length - 1 ? part.toLowerCase() : part.charAt(0) + part.slice(1).toLowerCase()
    )
    .join('-')
  return { key, run, preventDefault: true, stopPropagation: true }
}

/**
 * Undo and redo in a CodeMirror field on the app's own shortcuts for them, ahead of everything
 * else, and kept from the page: the document's undo, the app's key handlers, and the desktop
 * menu's accelerators never see a key the field has taken. Needs `history()`.
 */
export function appHistoryKeys(): Extension {
  return Prec.highest(
    keymap.of([commandBinding('edit.undo', undo), commandBinding('edit.redo', redo)])
  )
}
