import { describe, expect, test } from 'bun:test'

import { EDITOR_COMMAND_METADATA, type EditorCommandId } from '@pairdraw/vue/editor/commands'

import { commandShortcutLabel } from '@/app/editor/canvas/menu/model'

// Recorded from the Linux QA run: the layer context menu printed the macOS Delete glyph on Linux,
// because the item rendered the command metadata directly instead of formatting it for the platform.
const MAC_ONLY_GLYPHS = /[⌘⇧⌥⌃⌫⇥↩⇞⇟]/u

describe('commandShortcutLabel', () => {
  test('names the Delete key off macOS instead of printing its glyph', () => {
    expect(commandShortcutLabel('selection.delete', 'linux')).toBe('Backspace')
    expect(commandShortcutLabel('selection.delete', 'windows')).toBe('Backspace')
    expect(commandShortcutLabel('selection.delete', 'mac')).toBe('⌫')
  })

  test('leaves no macOS-only glyph in any command label off macOS', () => {
    const ids = Object.keys(EDITOR_COMMAND_METADATA) as EditorCommandId[]
    for (const platform of ['windows', 'linux'] as const) {
      for (const id of ids) {
        expect(commandShortcutLabel(id, platform) ?? '').not.toMatch(MAC_ONLY_GLYPHS)
      }
    }
  })

  test('prints modifier words rather than binding tokens off macOS', () => {
    expect(commandShortcutLabel('selection.duplicate', 'linux')).toBe('Ctrl+D')
    expect(commandShortcutLabel('selection.duplicate', 'mac')).toBe('⌘D')
  })
})
