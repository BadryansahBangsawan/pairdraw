<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue'

import { useCommandMessages, useCommonMessages } from '@open-pencil/vue/i18n'

import type { ShortcutSheetSection } from '@/app/shell/keyboard/sheet'
import { AppDialog } from '@/components/ui/dialog'

import ShortcutSheetBody from './ShortcutSheetBody.vue'

/** Every keyboard shortcut, grouped as the menus group them, with a search over names and keys. */
const { sections } = defineProps<{ sections: readonly ShortcutSheetSection[] }>()
const open = defineModel<boolean>('open', { default: false })

const commands = useCommandMessages()
const common = useCommonMessages()
const query = ref('')
const body = useTemplateRef<InstanceType<typeof ShortcutSheetBody>>('body')

watch(open, (isOpen) => {
  if (!isOpen) return
  query.value = ''
  void nextTick(() => body.value?.focus())
})
</script>

<template>
  <AppDialog
    v-model:open="open"
    size="xl"
    height="tall"
    :heading="commands.shortcutSheet"
    :description="commands.shortcutSheetDescription"
    :close-label="common.close"
  >
    <ShortcutSheetBody ref="body" v-model:query="query" :sections="sections" />
  </AppDialog>
</template>
