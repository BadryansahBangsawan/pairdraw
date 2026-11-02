<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { useId } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import ChatPromptComposer from '@/components/chat/ChatPromptComposer.vue'
import theme from '@/theme/home/prompt-composer'

/** Home's start from a prompt: what it sends opens a new design whose AI chat takes it. */
const prompt = defineModel<string>({ required: true })
const { busy = false } = defineProps<{
  /** The prompt is on its way, such as while AI setup it waits for is open. */
  busy?: boolean
}>()
const emit = defineEmits<{ submit: [text: string] }>()
const { ai } = useI18n()
const headingId = useId()
const styles = tv(theme)()
</script>

<template>
  <section :aria-labelledby="headingId" :class="styles.root()">
    <h2 :id="headingId" :class="styles.heading()">
      {{ ai.promptStartTitle }}
    </h2>
    <ChatPromptComposer
      v-model="prompt"
      :label="ai.promptStartLabel"
      :placeholder="ai.promptStartPlaceholder"
      :busy="busy"
      :ui="{ field: styles.field() }"
      @submit="emit('submit', $event)"
    />
  </section>
</template>
