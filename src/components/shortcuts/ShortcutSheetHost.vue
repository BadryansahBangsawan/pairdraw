<script setup lang="ts">
import { uniq } from 'es-toolkit'
import { computed } from 'vue'

import { EDITOR_TOOLS, resolveEditorProfile, type Tool } from '@open-pencil/core'
import {
  editorCommandMetadata,
  formatShortcut,
  useEditorCommands,
  type EditorCommandId
} from '@open-pencil/vue/editor/commands'
import { useCommandMessages, useMenuMessages, usePanelMessages } from '@open-pencil/vue/i18n'

import { CHAT_COLUMN_SHORTCUT } from '@/app/ai/chat/panel'
import { useEditorStore } from '@/app/editor/active-store'
import {
  CANVAS_COPY_AS_ACTIONS,
  CANVAS_PROPERTIES_ACTIONS,
  type CanvasContextActionMeta
} from '@/app/editor/canvas/menu/registry'
import { toolShortcutLabels } from '@/app/editor/toolbar/shortcuts'
import { REMOVE_AUTO_LAYOUT_SHORTCUT } from '@/app/shell/keyboard/auto-layout'
import {
  menuShortcutEntries,
  SHORTCUT_SHEET_SHORTCUT,
  shortcutSheetOpen,
  shortcutSheetSections,
  type ShortcutSheetEntry,
  type ShortcutSheetSection
} from '@/app/shell/keyboard/sheet'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import { useToolLabels } from '@/components/toolbar/labels'

import ShortcutSheet from './ShortcutSheet.vue'

/**
 * The shortcut sheet with the editor's own keys: the tools the document offers, every menu item
 * with a key, and the canvas keys no menu lists. `?` and the toolbar's keyboard button open it.
 */
const store = useEditorStore()
const { topMenus } = useAppMenu()
const { getCommand } = useEditorCommands()
const commands = useCommandMessages()
const menu = useMenuMessages()
const panels = usePanelMessages()
const toolLabels = useToolLabels()

/** The command palette's own key, which `CommandPalette.vue` binds. */
const COMMAND_PALETTE_SHORTCUT = 'MOD+K'

/** Canvas commands no menu lists, each with the key the editor binds. */
const CANVAS_COMMANDS: readonly EditorCommandId[] = [
  'selection.selectChildren',
  'selection.selectParent',
  'selection.selectNextSibling',
  'selection.selectPreviousSibling',
  'selection.setOpacity'
]

function entry(id: string, label: string, token: string): ShortcutSheetEntry[] {
  const shortcut = formatShortcut(token)
  return shortcut ? [{ id, label, shortcut }] : []
}

const toolEntries = computed(() => {
  const profile = resolveEditorProfile(store.state)
  const shortcuts = toolShortcutLabels(profile.toolKeys)
  const tools = uniq(EDITOR_TOOLS.flatMap((tool): Tool[] => tool.flyout ?? [tool.key]))
  return [
    ...tools.flatMap((tool) =>
      shortcuts[tool]
        ? [{ id: `tool-${tool}`, label: toolLabels.value[tool], shortcut: shortcuts[tool] }]
        : []
    ),
    ...entry('pan-while-held', commands.value.panWhileHeld, 'Space')
  ]
})

function canvasActionEntries(actions: readonly CanvasContextActionMeta[]) {
  return actions.flatMap((action) =>
    action.shortcut ? entry(action.id, menu.value[action.labelKey], action.shortcut) : []
  )
}

const canvasEntries = computed(() => [
  ...CANVAS_COMMANDS.flatMap((id) => {
    const token = editorCommandMetadata(id).shortcut
    return token ? entry(id, getCommand(id).label, token) : []
  }),
  ...entry('nudge', commands.value.nudgeSelection, '←→↑↓'),
  ...entry('nudge-further', commands.value.nudgeSelectionFurther, 'SHIFT+←→↑↓'),
  ...canvasActionEntries(CANVAS_COPY_AS_ACTIONS),
  ...canvasActionEntries(CANVAS_PROPERTIES_ACTIONS),
  ...entry('remove-auto-layout', panels.value.removeAutoLayout, REMOVE_AUTO_LAYOUT_SHORTCUT),
  ...entry('toggle-ai', commands.value.toggleAIChat, CHAT_COLUMN_SHORTCUT),
  ...entry('command-palette', commands.value.paletteAriaLabel, COMMAND_PALETTE_SHORTCUT),
  ...entry('shortcut-sheet', commands.value.shortcutSheet, SHORTCUT_SHEET_SHORTCUT)
])

const open = computed({
  get: () => shortcutSheetOpen.value,
  set: (value: boolean) => {
    shortcutSheetOpen.value = value
  }
})

const sections = computed<ShortcutSheetSection[]>(() =>
  shortcutSheetSections([
    { id: 'tools', label: commands.value.shortcutSheetTools, entries: toolEntries.value },
    ...topMenus.value.map((group, index) => ({
      id: `menu-${index}`,
      label: group.label,
      entries: menuShortcutEntries(group.items)
    })),
    { id: 'canvas', label: commands.value.shortcutSheetCanvas, entries: canvasEntries.value }
  ])
)
</script>

<template>
  <ShortcutSheet v-model:open="open" :sections="sections" />
</template>
