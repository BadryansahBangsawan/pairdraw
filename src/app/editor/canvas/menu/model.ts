import {
  editorCommandMetadata,
  formatShortcut,
  type EditorCommandId,
  type ShortcutPlatform
} from '@pairdraw/vue/editor/commands'

const COMPONENT_MENU_LABEL_PARTS = ['component', 'instance']

function isComponentMenuItem(label: string) {
  const normalized = label.toLowerCase()
  return COMPONENT_MENU_LABEL_PARTS.some((part) => normalized.includes(part))
}

export function canvasMenuItemClass(label: string, classes: { item: string; component: string }) {
  return isComponentMenuItem(label) ? classes.component : classes.item
}

export function canvasMenuShortcutClass(label: string) {
  return isComponentMenuItem(label) ? 'text-component/60' : 'text-muted'
}

/**
 * The keys a command prints in a menu item, in this platform's words: `Backspace` off macOS
 * rather than the `⌫` the metadata carries, and `Ctrl+D` rather than `MOD+D`. A context-menu item
 * that prints a command's shortcut goes through here; printing the metadata value directly shows
 * the macOS glyph on every platform.
 */
export function commandShortcutLabel(
  id: EditorCommandId,
  platform?: ShortcutPlatform
): string | undefined {
  return formatShortcut(editorCommandMetadata(id).shortcut, platform)
}
