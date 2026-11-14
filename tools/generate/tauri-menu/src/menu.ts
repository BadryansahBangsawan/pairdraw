import { compact } from 'es-toolkit/array'

import { editorCommandMetadata } from '@pairdraw/vue/editor/commands'

import { APP_MENU_APP_ITEMS, APP_MENU_SCHEMA } from '@/app/shell/menu/schema'
import type { AppMenuActionItem, AppMenuEntry, AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { shortcutTokenToAccelerator } from '@/app/shell/menu/shortcut'

export const MENU_PATH = 'desktop/generated/menu.json'
export const APP_MENU_PATH = 'desktop/generated/app-menu.json'

function isNativeVisible(entry: { target?: string }): boolean {
  return entry.target !== 'browser'
}

/** A separator the native menu builder understands, as opposed to one the schema declares. */
function isNativeSeparator(entry: unknown): boolean {
  return (
    typeof entry === 'object' && entry !== null && 'type' in entry && entry.type === 'separator'
  )
}

function entryAccelerator(entry: AppMenuActionItem): string | undefined {
  const shortcut =
    entry.shortcut ?? (entry.command ? editorCommandMetadata(entry.command).shortcut : undefined)
  return entry.accelerator ?? shortcutTokenToAccelerator(shortcut)
}

function cleanEntry(entry: AppMenuEntry): unknown | null {
  if (!isNativeVisible(entry)) return null
  if (entry.type === 'separator') return { type: 'separator' }
  return {
    id: entry.id,
    label: entry.label,
    accelerator: entryAccelerator(entry),
    checkbox: entry.checkbox,
    feature: entry.feature,
    sub: entry.sub ? nativeItems(entry.sub) : undefined
  }
}

/**
 * Entries the native menu can show, with the separators a browser-only entry leaves behind
 * removed: a group never starts or ends with one, and two never sit next to each other.
 */
export function nativeItems(entries: readonly AppMenuEntry[]): unknown[] {
  const items: unknown[] = []
  for (const item of compact(entries.map(cleanEntry))) {
    if (!isNativeSeparator(item)) {
      items.push(item)
    } else if (items.length > 0 && !isNativeSeparator(items[items.length - 1])) {
      items.push(item)
    }
  }
  while (items.length > 0 && isNativeSeparator(items[items.length - 1])) items.pop()
  return items
}

export function cleanGroup(group: AppMenuGroupSchema): unknown | null {
  if (!isNativeVisible(group)) return null
  return {
    label: group.label,
    items: nativeItems(group.items)
  }
}

export function renderMenu(): string {
  const menu = compact(APP_MENU_SCHEMA.map(cleanGroup))
  return `${JSON.stringify(menu, null, 2)}\n`
}

function renderAppMenu(): string {
  // Keyed by id so the native builder cannot silently drop a label.
  const items = Object.fromEntries(
    APP_MENU_APP_ITEMS.map((entry) => [
      entry.id,
      { label: entry.label, accelerator: entryAccelerator(entry) }
    ])
  )
  return `${JSON.stringify(items, null, 2)}\n`
}

/** Committed artifacts, keyed by workspace-relative path. */
export const MENU_ARTIFACTS: Record<string, () => string> = {
  [MENU_PATH]: renderMenu,
  [APP_MENU_PATH]: renderAppMenu
}
