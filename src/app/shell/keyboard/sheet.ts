import { ref } from 'vue'

import type { MenuEntry } from '@open-pencil/vue/editor/menu-model'

/** The key that opens the sheet, as the sheet and tooltips print it. */
export const SHORTCUT_SHEET_SHORTCUT = '?'

/**
 * The keys that open the sheet: `?` by the character typed, wherever the layout puts it. It is not
 * also bound by key code, since Shift and the US `?` key type `_`, `§`, or `,` on other layouts.
 */
export const SHORTCUT_SHEET_KEYBINDINGS = ['Shift+?']

export interface ShortcutSheetEntry {
  id: string
  label: string
  /** The keys as this platform prints them, such as `⌥⌘G` or `Ctrl+Alt+G`. */
  shortcut: string
}

export interface ShortcutSheetSection {
  id: string
  label: string
  entries: ShortcutSheetEntry[]
}

export const shortcutSheetOpen = ref(false)

export function openShortcutSheet(): void {
  shortcutSheetOpen.value = true
}

/** Every item of a menu, its submenus included, that has a shortcut, in menu order. */
export function menuShortcutEntries(entries: readonly MenuEntry[]): ShortcutSheetEntry[] {
  return entries.flatMap((entry): ShortcutSheetEntry[] => {
    if (entry.separator) return []
    const children = menuShortcutEntries(entry.sub ?? [])
    if (!entry.shortcut) return children
    const id = entry.menuId ?? entry.id ?? entry.label
    return [{ id, label: entry.label, shortcut: entry.shortcut }, ...children]
  })
}

/**
 * The sections the sheet shows: empty sections go, and an entry already listed under the same
 * keys and name, such as a command a menu and the canvas both offer, appears once.
 */
export function shortcutSheetSections(
  sections: readonly ShortcutSheetSection[]
): ShortcutSheetSection[] {
  const seen = new Set<string>()
  return sections.flatMap((section) => {
    const entries = section.entries.filter((entry) => {
      const key = `${entry.shortcut}\0${entry.label}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return entries.length > 0 ? [{ ...section, entries }] : []
  })
}

/**
 * The key caps of each alternative: `1-9, 0` is two alternatives, printed with the comma between
 * them, and `G G` is two presses of one alternative, each with its own cap. Only a comma and a
 * space part alternatives, so a comma key such as `⌘,` stays one cap.
 */
export function shortcutKeyGroups(shortcut: string): string[][] {
  return shortcut
    .split(', ')
    .map((alternative) => alternative.split(' ').filter((part) => part.length > 0))
    .filter((caps) => caps.length > 0)
}

function searchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replaceAll(/\s+/g, ' ').trim()
}

/** The entries whose name or keys contain the query; a section's name matches all of it. */
export function filterShortcutSheet(
  sections: readonly ShortcutSheetSection[],
  query: string
): ShortcutSheetSection[] {
  const needle = searchText(query)
  if (!needle) return [...sections]
  return sections.flatMap((section) => {
    if (searchText(section.label).includes(needle)) return [section]
    const entries = section.entries.filter(
      (entry) =>
        searchText(entry.label).includes(needle) || searchText(entry.shortcut).includes(needle)
    )
    return entries.length > 0 ? [{ ...section, entries }] : []
  })
}
