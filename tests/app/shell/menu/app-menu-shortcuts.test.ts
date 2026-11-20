import { describe, expect, test } from 'bun:test'

import type { AppMenuGroupSchema } from '@/app/shell/menu/schema'
import { appMenuShortcuts } from '@/app/shell/menu/shortcut'

const FIXTURE = [
  {
    label: 'Edit',
    items: [
      { id: 'edit.undo', label: 'Undo', shortcut: 'MOD+Z' },
      { id: 'edit.redo', label: 'Redo', shortcut: 'MOD+SHIFT+Z' },
      { id: 'selection.selectAll', label: 'Select all', shortcut: 'MOD+A' },
      { id: 'copy', label: 'Copy', shortcut: 'MOD+C' },
      { id: 'cut', label: 'Cut', shortcut: 'MOD+X' },
      { id: 'paste', label: 'Paste', shortcut: 'MOD+V' }
    ]
  },
  {
    label: 'Arrange',
    items: [
      { id: 'group', label: 'Group', shortcut: 'MOD+G' },
      { id: 'frame', label: 'Frame', shortcut: 'MOD+ALT+G' },
      {
        id: 'more',
        label: 'More',
        sub: [{ id: 'rotate', label: 'Rotate', shortcut: 'MOD+R' }]
      },
      { type: 'separator' }
    ]
  }
] as const satisfies readonly AppMenuGroupSchema[]

describe('appMenuShortcuts', () => {
  test('collects every shortcut a menu item takes, nested ones included', () => {
    expect(appMenuShortcuts(FIXTURE)).toEqual(['MOD+G', 'MOD+ALT+G', 'MOD+R'])
  })

  test('leaves out the edits a focused field does itself', () => {
    expect(appMenuShortcuts(FIXTURE)).not.toContain('MOD+Z')
    expect(appMenuShortcuts(FIXTURE)).not.toContain('MOD+V')
  })

  test('reads command items through their command metadata', () => {
    expect(
      appMenuShortcuts([
        { label: 'Select', items: [{ id: 'group', label: 'Group', command: 'selection.group' }] }
      ])
    ).toEqual(['MOD+G'])
  })

  test('the app menu keeps a field own undo out of the keys to drop', () => {
    expect(appMenuShortcuts()).toContain('MOD+N')
    expect(appMenuShortcuts()).not.toContain('MOD+Z')
  })
})
