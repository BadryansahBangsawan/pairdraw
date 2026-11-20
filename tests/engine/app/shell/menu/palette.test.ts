import { describe, expect, test } from 'bun:test'

import type { MenuActionNode, MenuEntry } from '@pairdraw/vue/editor/menu-model'

import { buildPaletteEntries } from '@/app/shell/menu/palette'

const keys = (shortcut: string) => shortcut.split('+')
const noKeys = () => undefined

function action(id: string, label = id, extra: Partial<MenuActionNode> = {}): MenuActionNode {
  return { menuId: id, label, action: () => undefined, ...extra }
}

function submenu(id: string, label: string, sub: MenuEntry[]): MenuActionNode {
  return { menuId: id, label, sub }
}

describe('command palette entries', () => {
  test('a submenu opens its children instead of becoming a dead entry', () => {
    const entries = buildPaletteEntries(
      submenu('theme', 'Theme', [
        action('theme-light', 'Light'),
        action('theme-dark', 'Dark'),
        action('theme-auto', 'Auto')
      ]),
      undefined,
      noKeys
    )

    const parent = entries.find((entry) => entry.id === 'theme')
    expect(parent?.children?.map((child) => child.id)).toEqual([
      'theme-light',
      'theme-dark',
      'theme-auto'
    ])
    expect(parent?.onSelect).toBeUndefined()
  })

  test('keeps a submenu’s leaves searchable at the top level', () => {
    const entries = buildPaletteEntries(
      submenu('theme', 'Theme', [action('theme-light', 'Light'), action('theme-dark', 'Dark')]),
      undefined,
      noKeys
    )

    expect(entries.map((entry) => entry.id)).toEqual(['theme', 'theme-light', 'theme-dark'])
  })

  test('every entry either runs something or opens its children', () => {
    const entries = buildPaletteEntries(
      {
        menuId: 'file',
        label: 'File',
        sub: [
          action('new', 'New'),
          submenu('export-selection', 'Export Selection', [
            action('export-png', 'PNG'),
            action('export-svg', 'SVG')
          ]),
          { separator: true }
        ]
      },
      undefined,
      noKeys
    )

    for (const entry of entries) {
      expect(entry.onSelect !== undefined || (entry.children?.length ?? 0) > 0).toBe(true)
    }
  })

  test('a checked item toggles through its callback', () => {
    let checked: boolean | undefined
    const entries = buildPaletteEntries(
      {
        menuId: 'view-rulers',
        label: 'Rulers',
        checked: false,
        onCheckedChange: (value: boolean) => {
          checked = value
        }
      },
      undefined,
      noKeys
    )

    entries[0]?.onSelect?.()
    expect(checked).toBe(true)
  })

  test('formats the palette shortcut', () => {
    const entries = buildPaletteEntries(
      action('save', 'Save', { paletteShortcut: 'MOD+S' }),
      undefined,
      keys
    )

    expect(entries[0]?.shortcut).toEqual({ keys: ['MOD', 'S'] })
  })

  test('skips separators and entries without a menu id', () => {
    expect(buildPaletteEntries({ separator: true }, undefined, noKeys)).toEqual([])
    expect(
      buildPaletteEntries({ label: 'Generated', sub: [action('leaf', 'Leaf')] }, undefined, noKeys)
    ).toEqual([expect.objectContaining({ id: 'leaf' })])
  })
})
