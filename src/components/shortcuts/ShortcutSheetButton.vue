<script setup lang="ts">
import { ToolbarButton } from 'reka-ui'
import { tv } from 'tailwind-variants'
import IconKeyboard from '~icons/lucide/keyboard'

import { useCommandMessages } from '@open-pencil/vue/i18n'

import { toolTip } from '@/app/editor/toolbar/shortcuts'
import { openShortcutSheet, SHORTCUT_SHEET_SHORTCUT } from '@/app/shell/keyboard/sheet'
import type { ToolbarUI } from '@/components/toolbar/types'
import Tip from '@/components/ui/overlay/Tip.vue'
import toolbarTheme from '@/theme/toolbar'

/**
 * The toolbar's keyboard button, which opens the shortcut sheet as `?` does. It opens a dialog
 * rather than arming a tool, so it is not a toggle and never takes the active tool's ink fill.
 */
const { ui } = defineProps<{ ui?: ToolbarUI }>()
const commands = useCommandMessages()
const styles = tv(toolbarTheme)({ active: false })
</script>

<template>
  <Tip :label="toolTip(commands.shortcutSheet, SHORTCUT_SHEET_SHORTCUT)">
    <ToolbarButton
      aria-haspopup="dialog"
      :aria-label="commands.shortcutSheet"
      :class="styles.button({ class: ui?.button })"
      @click="openShortcutSheet"
    >
      <IconKeyboard :class="styles.icon({ class: ui?.icon })" />
    </ToolbarButton>
  </Tip>
</template>
