<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

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
  rows = 3
} = defineProps<{
  /** The field's accessible name. */
  label: string
  placeholder: string
  /** A send is under way, such as the AI setup it waits for; another cannot start. */
  busy?: boolean
  rows?: number
}>()
const emit = defineEmits<{ submit: [text: string] }>()
const { ai } = useI18n()
const prompt = computed(() => text.value.trim())

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
    <InputGroup size="md" :ui="{ root: 'bg-panel shadow-sm' }">
      <textarea
        v-model="text"
        :rows="rows"
        :aria-label="label"
        :placeholder="placeholder"
        class="block max-h-60 min-h-16 w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-relaxed text-surface outline-none field-sizing-content placeholder:text-muted"
        @keydown="onKeydown"
      />
      <template #actions>
        <IconButton
          :label="ai.sendMessage"
          size="sm"
          type="submit"
          :disabled="busy || !prompt"
          class="bg-accent text-on-accent hover:bg-accent/90 hover:text-on-accent"
        >
          <icon-lucide-arrow-up class="size-3.5" />
        </IconButton>
      </template>
    </InputGroup>
  </form>
</template>
