import { describe, expect, test } from 'bun:test'

import type { MenuEntry } from '@open-pencil/vue/editor/menu-model'

import {
  filterShortcutSheet,
  menuShortcutEntries,
  shortcutKeyGroups,
  shortcutSheetSections,
  type ShortcutSheetSection
} from '@/app/shell/keyboard/sheet'

describe('menuShortcutEntries', () => {
  test('lists items with a key, submenus included, and skips separators and keyless items', () => {
    const menu: MenuEntry[] = [
      { menuId: 'save', label: 'Save', shortcut: '⌘S' },
      { separator: true },
      { menuId: 'save-to', label: 'Save to…' },
      {
        menuId: 'export-selection',
        label: 'Export selection',
        shortcut: '⇧⌘E',
        sub: [
          { menuId: 'export-png', label: 'PNG' },
          { menuId: 'nested', label: 'Nested', shortcut: '⌥N' }
        ]
      },
      { id: 'selection.frameSelection', label: 'Frame selection', shortcut: '⌥⌘G' }
    ]

    expect(menuShortcutEntries(menu).map((entry) => entry.id)).toEqual([
      'save',
      'export-selection',
      'nested',
      'selection.frameSelection'
    ])
  })
})

describe('shortcutSheetSections', () => {
  test('drops empty sections and repeats of an entry already listed', () => {
    const sections = shortcutSheetSections([
      { id: 'a', label: 'A', entries: [{ id: 'undo', label: 'Undo', shortcut: '⌘Z' }] },
      { id: 'empty', label: 'Empty', entries: [] },
      {
        id: 'b',
        label: 'B',
        entries: [
          { id: 'undo-again', label: 'Undo', shortcut: '⌘Z' },
          { id: 'redo', label: 'Redo', shortcut: '⇧⌘Z' }
        ]
      }
    ])

    expect(sections.map((section) => section.id)).toEqual(['a', 'b'])
    expect(sections[1]?.entries.map((entry) => entry.id)).toEqual(['redo'])
  })
})

describe('filterShortcutSheet', () => {
  const sections: ShortcutSheetSection[] = [
    {
      id: 'arrange',
      label: 'Arrange',
      entries: [
        { id: 'left', label: 'Align left', shortcut: '⌥A' },
        { id: 'top', label: 'Align top', shortcut: '⌥W' }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      entries: [{ id: 'replace', label: 'Paste to replace', shortcut: '⇧⌘R' }]
    }
  ]

  test('keeps everything for an empty or blank query', () => {
    expect(filterShortcutSheet(sections, '   ')).toEqual(sections)
  })

  test('matches names case-insensitively and drops sections left empty', () => {
    const shown = filterShortcutSheet(sections, '  ALIGN  TOP ')
    expect(shown.map((section) => section.id)).toEqual(['arrange'])
    expect(shown[0]?.entries.map((entry) => entry.id)).toEqual(['top'])
  })

  test('matches the printed keys', () => {
    const shown = filterShortcutSheet(sections, '⇧⌘')
    expect(shown.flatMap((section) => section.entries.map((entry) => entry.id))).toEqual([
      'replace'
    ])
  })

  test('a matching section name keeps the whole section', () => {
    const shown = filterShortcutSheet(sections, 'arrange')
    expect(shown[0]?.entries).toHaveLength(2)
  })
})

describe('shortcutKeyGroups', () => {
  test('parts alternatives at a comma and a space, and presses at a space', () => {
    expect(shortcutKeyGroups('1-9, 0')).toEqual([['1-9'], ['0']])
    expect(shortcutKeyGroups('G G')).toEqual([['G', 'G']])
    expect(shortcutKeyGroups('⌥⌘G')).toEqual([['⌥⌘G']])
  })

  test('keeps a comma key in its cap', () => {
    expect(shortcutKeyGroups('⌘,')).toEqual([['⌘,']])
    expect(shortcutKeyGroups('Ctrl+,')).toEqual([['Ctrl+,']])
  })
})
