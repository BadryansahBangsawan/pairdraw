<script setup lang="ts">
import IconImagePlus from '~icons/lucide/image-plus'

import { useMenuMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { openPlaceImageDialog } from '@/app/editor/place/dialog'
import { toolTip } from '@/app/editor/toolbar/shortcuts'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import ToolButton from '@/components/toolbar/ToolButton.vue'
import type { ToolbarUI } from '@/components/toolbar/types'
import Tip from '@/components/ui/overlay/Tip.vue'

/** The toolbar's Place image button, which the File menu's command shares. */
const { ui, mobile = false } = defineProps<{ ui?: ToolbarUI; mobile?: boolean }>()
const store = useEditorStore()
const menu = useMenuMessages()
</script>

<template>
  <Tip :label="toolTip(menu.placeImage, appMenuShortcutLabel('place-image') ?? '')">
    <ToolButton
      :icon="IconImagePlus"
      :label="menu.placeImage"
      :mobile="mobile"
      :ui="ui"
      @click="openPlaceImageDialog(store)"
    />
  </Tip>
</template>
