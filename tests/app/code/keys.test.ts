import { describe, expect, test } from 'bun:test'

import { withoutMenuKeys } from '@/components/code-editor/keys'

describe('withoutMenuKeys', () => {
  test('drops a binding whose key a menu item takes', () => {
    expect(
      withoutMenuKeys([{ key: 'Shift-Mod-k' }, { key: 'Mod-k' }], ['MOD+SHIFT+K'], 'other')
    ).toHaveLength(1)
  })

  test('reads an uppercase CodeMirror letter as Shift, so Alt-A is not the menu Alt+A', () => {
    expect(withoutMenuKeys([{ key: 'Alt-A' }], ['ALT+A'], 'other')).toHaveLength(1)
    expect(withoutMenuKeys([{ key: 'Alt-Shift-a' }], ['ALT+SHIFT+A'], 'other')).toHaveLength(0)
  })

  test('Mod is Command on macOS and Control elsewhere', () => {
    expect(withoutMenuKeys([{ key: 'Mod-k' }], ['MOD+K'], 'mac')).toHaveLength(0)
    expect(withoutMenuKeys([{ key: 'Ctrl-k' }], ['MOD+K'], 'other')).toHaveLength(0)
    expect(withoutMenuKeys([{ key: 'Ctrl-k' }], ['MOD+K'], 'mac')).toHaveLength(1)
  })

  test('a platform key of the binding replaces its generic key', () => {
    expect(withoutMenuKeys([{ key: 'Mod-k', mac: 'Ctrl-k' }], ['MOD+K'], 'mac')).toHaveLength(1)
  })
})
