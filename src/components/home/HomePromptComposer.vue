<script setup lang="ts">
import { useId } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import ChatPromptComposer from '@/components/chat/ChatPromptComposer.vue'

/** Home's start from a prompt: what it sends opens a new design whose AI chat takes it. */
const prompt = defineModel<string>({ required: true })
const { busy = false } = defineProps<{
  /** The prompt is on its way, such as while AI setup it waits for is open. */
  busy?: boolean
}>()
const emit = defineEmits<{ submit: [text: string] }>()
const { ai } = useI18n()
const headingId = useId()
</script>

<template>
  <section :aria-labelledby="headingId" class="mx-auto mb-5 w-full max-w-2xl md:mb-8">
    <h2 :id="headingId" class="mb-2.5 text-center text-base font-semibold text-surface">
      {{ ai.promptStartTitle }}
    </h2>
    <ChatPromptComposer
      v-model="prompt"
      :label="ai.promptStartLabel"
      :placeholder="ai.promptStartPlaceholder"
      :busy="busy"
      @submit="emit('submit', $event)"
    />
  </section>
</template>
