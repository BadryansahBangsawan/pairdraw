<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'

/**
 * Says the coding agent running this chat has sent nothing for a while — it may be thinking or
 * running a long command — and keeps the turn's Stop within reach. It is not an error and does
 * not end anything: the agent clears it with its next update.
 */
const { agent, since } = defineProps<{
  /** The agent's name, such as the provider it runs through. */
  agent: string
  /** How long ago the agent last sent an update, already in the person's language. */
  since: string
}>()
const emit = defineEmits<{ stop: [] }>()

const { ai } = useI18n()
</script>

<template>
  <p
    role="status"
    data-test-id="chat-quiet-notice"
    class="flex items-center gap-2 px-3.5 py-1.5 text-xs text-muted"
  >
    <icon-lucide-clock class="size-3 shrink-0" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate">{{ ai.chatAgentQuiet({ agent, since }) }}</span>
    <AppButton size="xs" variant="link" @click="emit('stop')">
      {{ ai.stopGenerating }}
    </AppButton>
  </p>
</template>
