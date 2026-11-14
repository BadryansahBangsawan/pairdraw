<script setup lang="ts">
import { computed } from 'vue'

import { useAIMessages } from '@pairdraw/vue/i18n'

import { revealLocalFile } from '@/app/ai/chat/references/files'
import { toast } from '@/app/shell/ui'
import { chatReferenceTheme } from '@/components/chat/ui'
import Tip from '@/components/ui/overlay/Tip.vue'

/**
 * The `chat-file` inline component `fileLinkComponents` writes into a desktop reply: a link to a
 * file on this computer, which shows the file in its folder rather than opening it.
 */
const { path, label } = defineProps<{ path: string; label: string }>()

const ai = useAIMessages()
const ui = chatReferenceTheme()
const action = computed(() => ai.value.revealLocalFile({ path }))

async function reveal() {
  try {
    await revealLocalFile(path)
  } catch {
    toast.error(ai.value.revealLocalFileFailed({ path }))
  }
}
</script>

<template>
  <Tip :label="action" as-child>
    <button
      type="button"
      :class="ui.root()"
      :aria-label="action"
      data-slot="chat-file-link"
      @click="void reveal()"
    >
      <icon-lucide-file-symlink :class="ui.icon()" aria-hidden="true" />
      <span :class="ui.label()">{{ label }}</span>
    </button>
  </Tip>
</template>
