<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import { chatInputTheme } from '@/components/chat/ui'
import IconButton from '@/components/ui/button/IconButton.vue'

/** A text file attached to the message being written, which the person can take off again. */
const { name } = defineProps<{ name: string }>()
const emit = defineEmits<{ remove: [] }>()
const { ai } = useI18n()
const ui = chatInputTheme()
</script>

<template>
  <div :class="ui.file()">
    <span :class="ui.fileIcon()"><icon-lucide-file-text class="size-4" aria-hidden="true" /></span>
    <span :class="ui.fileName()">{{ name }}</span>
    <IconButton :label="ai.removeFileAttachment({ name })" size="xs" @click="emit('remove')">
      <icon-lucide-x class="size-3" />
    </IconButton>
  </div>
</template>
