import type { Component } from 'vue'

import type { MenuEntry } from '@pairdraw/vue/editor/menu-model'
import type { CommandPaletteItem } from '@pairdraw/vue/primitives/CommandPalette'

/** A shortcut token (`MOD+SHIFT+E`) as the keys the palette prints beside the item. */
export type PaletteShortcutKeys = (shortcut: string) => string[] | undefined

/**
 * One menu entry as palette items: the entry itself, then, for a submenu, its items flattened
 * after it. A submenu's entry opens its children in the palette instead of closing it without
 * running anything, while its leaves stay in the flat list so a search finds them directly.
 */
export function buildPaletteEntries(
  entry: MenuEntry,
  fallbackIcon: Component | undefined,
  shortcutKeys: PaletteShortcutKeys
): CommandPaletteItem[] {
  if ('separator' in entry) return []
  if (!entry.menuId)
    return (
      entry.sub?.flatMap((child) => buildPaletteEntries(child, fallbackIcon, shortcutKeys)) ?? []
    )

  const shortcut = entry.paletteShortcut
  const children =
    entry.sub?.flatMap((child) => buildPaletteEntries(child, fallbackIcon, shortcutKeys)) ?? []
  const item: CommandPaletteItem = {
    id: entry.menuId,
    label: entry.palette?.label ?? entry.label,
    icon: entry.palette?.icon ?? fallbackIcon,
    shortcut: shortcut ? { keys: shortcutKeys(shortcut) ?? [] } : undefined,
    description: entry.palette?.description,
    keywords: entry.palette?.keywords,
    disabled: entry.disabled,
    onSelect:
      entry.action ??
      (entry.onCheckedChange ? () => entry.onCheckedChange?.(!entry.checked) : undefined),
    children: children.length > 0 ? children : undefined
  }
  return [item, ...children]
}
