<script lang="ts">
/** Which note a field edits. */
export type AgentNoteField = 'context' | 'prompt'
</script>

<script setup lang="ts">
import { templateRef } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { onMounted, ref, useId, watch } from 'vue'

import { useExploreMessages } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import agentNotesTheme from '@/theme/agent-notes'

/**
 * A layer's notes for agents: what the layer means or does, and a request about it that runs in
 * the chat when asked. Each field commits when it loses focus, so typing records no undo steps.
 */
const {
  context = '',
  prompt = '',
  disabled = false,
  focusOnMount = false
} = defineProps<{
  context?: string
  prompt?: string
  disabled?: boolean
  /** Whether the form opened for the person to type its first field, as Add notes does. */
  focusOnMount?: boolean
}>()
const emit = defineEmits<{
  commit: [field: AgentNoteField, value: string]
  run: [prompt: string]
}>()

const messages = useExploreMessages()
const styles = tv(agentNotesTheme)()
const contextId = useId()
const promptId = useId()
const contextDraft = ref(context)
const promptDraft = ref(prompt)
const contextField = templateRef<{ focus: () => void } | null>('contextField')

onMounted(() => {
  if (focusOnMount) contextField.value?.focus()
})

// What is stored replaces the drafts, such as after an undo or for another layer.
watch(
  () => context,
  (value) => (contextDraft.value = value)
)
watch(
  () => prompt,
  (value) => (promptDraft.value = value)
)

function commit(field: AgentNoteField) {
  const value = field === 'context' ? contextDraft.value : promptDraft.value
  emit('commit', field, value)
}
</script>

<template>
  <div :class="styles.root()" data-slot="agent-notes">
    <p :class="styles.description()">{{ messages.notesDescription }}</p>
    <div :class="styles.field()">
      <label :for="contextId" :class="styles.label()">{{ messages.context }}</label>
      <AppTextarea
        :id="contextId"
        ref="contextField"
        v-model="contextDraft"
        :rows="2"
        :disabled="disabled"
        :placeholder="messages.contextPlaceholder"
        @change="commit('context')"
      />
    </div>
    <div :class="styles.field()">
      <label :for="promptId" :class="styles.label()">{{ messages.prompt }}</label>
      <AppTextarea
        :id="promptId"
        v-model="promptDraft"
        :rows="2"
        :disabled="disabled"
        :placeholder="messages.promptPlaceholder"
        @change="commit('prompt')"
      />
    </div>
    <div :class="styles.actions()">
      <AppButton
        size="xs"
        variant="outline"
        :disabled="disabled || !promptDraft.trim()"
        @click="emit('run', promptDraft)"
      >
        <template #leading><icon-lucide-sparkles class="size-3" /></template>
        {{ messages.runPrompt }}
      </AppButton>
    </div>
  </div>
</template>
