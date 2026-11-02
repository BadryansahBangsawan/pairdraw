<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { chatInputTheme } from '@/components/chat/ui'
import IconButton from '@/components/ui/button/IconButton.vue'
import InputGroup from '@/components/ui/input/InputGroup.vue'

/**
 * A first message for the AI chat written before the chat shows, on Home or over an empty page:
 * Enter sends, Shift+Enter starts a new line. What it sends stays in the field until the parent
 * clears it, so a send that does not go through keeps the text.
 */
const text = defineModel<string>({ required: true })
const {
  label,
  placeholder,
  busy = false,
  rows = 3,
  ui
} = defineProps<{
  /** The field's accessible name. */
  label: string
  placeholder: string
  /** A send is under way, such as the AI setup it waits for; another cannot start. */
  busy?: boolean
  rows?: number
  /** Per-instance classes merged over the theme, such as a taller field for a page's first ask. */
  ui?: { field?: string }
}>()
const emit = defineEmits<{ submit: [text: string] }>()
const { ai } = useI18n()
const styles = chatInputTheme()
const prompt = computed(() => text.value.trim())
const field = useTemplateRef<HTMLTextAreaElement>('field')
/**
 * Puts the caret at the end of the prompt once a new value shows, as after picking an example to
 * edit before sending.
 */
defineExpose({
  focus: () =>
    nextTick(() => {
      const element = field.value
      if (!element) return
      element.focus()
      element.setSelectionRange(element.value.length, element.value.length)
    })
})

function submit() {
  if (busy || !prompt.value) return
  emit('submit', prompt.value)
}

function onKeydown(event: KeyboardEvent) {
  // Enter also confirms a word in an input method; that is not sending.
  if (event.isComposing) return
  if (event.code !== 'Enter' && event.code !== 'NumpadEnter') return
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return
  event.preventDefault()
  submit()
}
</script>

<template>
  <form @submit.prevent="submit">
    <InputGroup size="md" :ui="{ root: styles.group() }">
      <textarea
        ref="field"
        v-model="text"
        :rows="rows"
        :aria-label="label"
        :placeholder="placeholder"
        :class="styles.field({ class: ui?.field })"
        @keydown="onKeydown"
      />
      <template #actions>
        <IconButton
          :label="ai.sendMessage"
          size="sm"
          type="submit"
          :disabled="busy || !prompt"
          :class="styles.send()"
        >
          <icon-lucide-arrow-up :class="styles.sendIcon()" />
        </IconButton>
      </template>
    </InputGroup>
  </form>
</template>
