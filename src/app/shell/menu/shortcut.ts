import { editorCommandMetadata, formatShortcut } from '@pairdraw/vue/editor/commands'

import type { AppMenuActionItem, AppMenuEntry, AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

function isActionItem(entry: AppMenuEntry): entry is AppMenuActionItem {
  return !('type' in entry && entry.type === 'separator')
}

function findShortcutInEntries(entries: readonly AppMenuEntry[], id: string): string | undefined {
  for (const entry of entries) {
    if (!isActionItem(entry)) continue
    if (entry.id === id)
      return (
        entry.shortcut ??
        (entry.command ? editorCommandMetadata(entry.command).shortcut : undefined)
      )
    const shortcut = entry.sub ? findShortcutInEntries(entry.sub, id) : undefined
    if (shortcut) return shortcut
  }
  return undefined
}

/**
 * The menu's edits a focused text field carries out itself (`runFocusedCommand`), whose keys the
 * field keeps: undo and redo, select all, and the clipboard.
 */
const FIELD_EDIT_IDS = new Set([
  'edit.undo',
  'edit.redo',
  'selection.selectAll',
  'copy',
  'cut',
  'paste'
])

function collectShortcuts(
  entries: readonly AppMenuEntry[],
  shortcuts: string[],
  keepFieldEdits: boolean
): string[] {
  for (const entry of entries) {
    if (!isActionItem(entry)) continue
    if (keepFieldEdits || !FIELD_EDIT_IDS.has(entry.id)) {
      const shortcut =
        entry.shortcut ??
        (entry.command ? editorCommandMetadata(entry.command).shortcut : undefined)
      if (shortcut) shortcuts.push(shortcut)
    }
    if (entry.sub) collectShortcuts(entry.sub, shortcuts, keepFieldEdits)
  }
  return shortcuts
}

/**
 * Every shortcut the menu assigns on this platform, as stored (`MOD+SHIFT+K`), except the edits a
 * focused field does itself. An editor drops its own bindings on these keys: a native menu takes
 * the key first and then leaves it to the field, so the binding would never run.
 */
export function appMenuShortcuts(
  groups: readonly AppMenuGroupSchema[] = APP_MENU_SCHEMA
): string[] {
  return groups.flatMap((group) => collectShortcuts(group.items, [], false))
}

export function appMenuShortcut(id: string): string | undefined {
  for (const group of APP_MENU_SCHEMA) {
    const shortcut = findShortcutInEntries(group.items, id)
    if (shortcut) return shortcut
  }
  return undefined
}

function normalizeShortcutToken(shortcut: string): string {
  return shortcut === '⌫'
    ? 'Backspace'
    : shortcut.replaceAll('↩', 'Enter').replaceAll('⇞', 'PageUp').replaceAll('⇟', 'PageDown')
}

/** A letter becomes its key code, which the keyboard registry matches by layout (`shortcutCode`). */
export function shortcutTokenToTinykeys(shortcut: string | undefined): string | undefined {
  return shortcut
    ? normalizeShortcutToken(shortcut)
        .replaceAll('MOD', '$mod')
        .replaceAll('CTRL', 'Control')
        .replaceAll('SHIFT', 'Shift')
        .replaceAll('ALT', 'Alt')
        .replace(/(^|\+)([A-Z])$/, '$1Key$2')
    : undefined
}

export function shortcutTokenToAccelerator(shortcut: string | undefined): string | undefined {
  return shortcut
    ? normalizeShortcutToken(shortcut)
        .replaceAll('MOD', 'CmdOrCtrl')
        .replaceAll('CTRL', 'Ctrl')
        .replaceAll('SHIFT', 'Shift')
        .replaceAll('ALT', 'Alt')
    : undefined
}

export function appMenuShortcutLabel(id: string): string | undefined {
  return formatShortcut(appMenuShortcut(id))
}

export function appMenuTinykeysShortcut(id: string): string | undefined {
  return shortcutTokenToTinykeys(appMenuShortcut(id))
}

export function appMenuAccelerator(id: string): string | undefined {
  return shortcutTokenToAccelerator(appMenuShortcut(id))
}
