<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'

const { agent, page, document } = defineProps<{ agent: string; page?: string; document?: string }>()
const emit = defineEmits<{ open: [] }>()

const { ai } = useI18n()
</script>

<template>
  <p
    role="status"
    data-test-id="chat-run-location"
    class="flex items-center gap-2 px-3.5 py-1.5 text-xs text-muted"
  >
    <span v-if="document" class="min-w-0 flex-1 truncate">
      {{ ai.chatAgentWorkingIn({ agent, document }) }}
    </span>
    <span v-else class="min-w-0 flex-1 truncate">
      {{ ai.chatAgentWorkingOn({ agent, page: page ?? '' }) }}
    </span>
    <AppButton size="xs" variant="link" @click="emit('open')">
      {{ document ? ai.chatGoToDocument : ai.chatGoToPage }}
    </AppButton>
  </p>
</template>
