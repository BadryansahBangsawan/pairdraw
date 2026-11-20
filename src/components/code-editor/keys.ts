import type { KeyBinding } from '@codemirror/view'

import { appMenuShortcuts } from '@/app/shell/menu/shortcut'

/** The keyboard a shortcut is compared on: macOS's Command or the others' Control. */
export type KeyPlatform = 'mac' | 'other'

/** A modifier as both spellings name it: CodeMirror's `Mod` and the menu's `MOD`. */
function modifierName(name: string, platform: KeyPlatform): string | undefined {
  switch (name) {
    case 'Mod':
    case 'MOD':
      return platform === 'mac' ? 'meta' : 'ctrl'
    case 'Ctrl':
    case 'CTRL':
      return 'ctrl'
    case 'Alt':
    case 'ALT':
      return 'alt'
    case 'Shift':
    case 'SHIFT':
      return 'shift'
    case 'Cmd':
    case 'Meta':
    case 'META':
      return 'meta'
    default:
      return undefined
  }
}

/** One chord both spellings meet in, such as `meta+shift+k`, so only the resolved keys compare. */
function chord(modifiers: readonly string[], key: string): string {
  return [...new Set(modifiers)].sort().join('+') + ':' + key.toLowerCase()
}

/**
 * A CodeMirror key as a chord: `Shift-Mod-k` is the same key as the menu's `SHIFT+MOD+K`.
 * CodeMirror also reads an uppercase letter as Shift (`Alt-A` is Alt+Shift+A).
 */
function codeMirrorChord(name: string, platform: KeyPlatform): string {
  const parts = name.split('-')
  let key = parts.pop() ?? ''
  let shift = false
  if (/^[A-Z]$/.test(key)) {
    shift = true
    key = key.toLowerCase()
  }
  const modifiers = parts
    .map((part) => modifierName(part, platform))
    .filter((modifier): modifier is string => modifier !== undefined)
  if (shift) modifiers.push('shift')
  return chord(modifiers, key)
}

/** A menu shortcut as the same chord: `MOD+SHIFT+K` is its platform's own Command or Control. */
function menuChord(shortcut: string, platform: KeyPlatform): string {
  const parts = shortcut.replaceAll('⌫', 'Backspace').split('+')
  const key = parts.pop() ?? ''
  const modifiers = parts
    .map((part) => modifierName(part, platform))
    .filter((modifier): modifier is string => modifier !== undefined)
  return chord(modifiers, key)
}

/**
 * `bindings` without those whose key a menu item takes, so the editor never binds a key the menu
 * takes first and then leaves to the focused field.
 */
export function withoutMenuKeys(
  bindings: readonly KeyBinding[],
  shortcuts: readonly string[] = appMenuShortcuts(),
  platform: KeyPlatform = /mac|iphone|ipad/i.test(navigator.userAgent) ? 'mac' : 'other'
): KeyBinding[] {
  const taken = new Set(shortcuts.map((shortcut) => menuChord(shortcut, platform)))
  return bindings.filter((binding) => {
    const key = platform === 'mac' ? (binding.mac ?? binding.key) : (binding.win ?? binding.key)
    return key === undefined || !taken.has(codeMirrorChord(key, platform))
  })
}
