<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { useId, useTemplateRef } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import type { CreationKindId } from '@/app/home/creation'
import ChatPromptComposer from '@/components/chat/ChatPromptComposer.vue'
import HomeCreationKinds from '@/components/home/HomeCreationKinds.vue'
import theme from '@/theme/home/prompt-composer'

/** Home's start from a prompt: what it sends opens a new design whose AI chat takes it. */
const prompt = defineModel<string>({ required: true })
/** What the prompt is going to make; the choice guides the agent when the prompt is sent. */
const kind = defineModel<CreationKindId>('kind', { required: true })
const { busy = false, status = null } = defineProps<{
  /** The prompt is on its way, such as while AI setup it waits for is open. */
  busy?: boolean
  /** What the prompt waits for while it is on its way, such as looking for a coding agent. */
  status?: string | null
}>()
const emit = defineEmits<{ submit: [text: string] }>()
const { ai } = useI18n()
const headingId = useId()
const styles = tv(theme)()
const composer = useTemplateRef('composer')

/** Choosing a kind is a step towards writing the prompt, so the field takes the caret. */
function chooseKind(next: CreationKindId) {
  kind.value = next
  void composer.value?.focus()
}
</script>

<template>
  <section :aria-labelledby="headingId" :class="styles.root()">
    <h2 :id="headingId" :class="styles.heading()">
      {{ ai.promptStartTitle }}
    </h2>
    <HomeCreationKinds :model-value="kind" :disabled="busy" @update:model-value="chooseKind" />
    <ChatPromptComposer
      ref="composer"
      v-model="prompt"
      :label="ai.promptStartLabel"
      :placeholder="ai.promptStartPlaceholder"
      :busy="busy"
      :ui="{ field: styles.field() }"
      @submit="emit('submit', $event)"
    />
    <p role="status" :class="styles.status()">
      <template v-if="status">
        <icon-lucide-loader-2 :class="styles.spinner()" aria-hidden="true" />
        {{ status }}
      </template>
    </p>
  </section>
</template>
