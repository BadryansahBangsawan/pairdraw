<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, useTemplateRef } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import {
  closeCanvasPrompt,
  isShownPageEmpty,
  offersCanvasPrompt
} from '@/app/ai/chat/canvas-prompt'
import { sendPromptToDocument } from '@/app/ai/chat/pending-prompt'
import { ensureChatConfigured } from '@/app/ai/chat/setup'
import { useEditorStore } from '@/app/editor/active-store'
import ChatPromptComposer from '@/components/chat/ChatPromptComposer.vue'
import ChatPromptExamples from '@/components/chat/ChatPromptExamples.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import theme from '@/theme/editor/canvas-prompt'

/**
 * At the bottom of the canvas, a prompt that goes into the AI chat while the chat column is closed,
 * with examples under it while the page is empty. It takes the pointer only on its own controls, so
 * the canvas around it still draws, and it leaves while an agent works on the document.
 */
const store = useEditorStore()
const { ai } = useI18n()
const offered = computed(() => offersCanvasPrompt(store))
const pageEmpty = computed(() => isShownPageEmpty(store))
const styles = tv(theme)()
const prompt = ref('')
const starting = ref(false)
const composer = useTemplateRef('composer')

/** An example goes into the field to read and edit before it is sent. */
function pickExample(example: string) {
  prompt.value = example
  void composer.value?.focus()
}

/**
 * Sends the prompt into this document's chat, which opens in its column. Without a model, the chat looks for a coding agent
 * on this computer first, and guided setup opens only when it finds none.
 */
async function start(text: string): Promise<void> {
  if (starting.value) return
  starting.value = true
  try {
    if (!(await ensureChatConfigured())) return
    sendPromptToDocument(store, text)
    prompt.value = ''
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div v-if="offered" :class="styles.root()">
    <section data-canvas-obstacle :aria-label="ai.canvasPromptTitle" :class="styles.card()">
      <ChatPromptComposer
        ref="composer"
        v-model="prompt"
        inline
        :label="ai.promptStartLabel"
        :placeholder="ai.canvasPromptDescription"
        :busy="starting"
        :rows="1"
        :class="styles.composer()"
        @submit="start"
      />
      <IconButton :label="ai.canvasPromptClose" size="sm" @click="closeCanvasPrompt(store)">
        <icon-lucide-x class="size-3.5" />
      </IconButton>
    </section>
    <ChatPromptExamples
      v-if="pageEmpty"
      data-canvas-obstacle
      :disabled="starting"
      :class="styles.examples()"
      @pick="pickExample"
    />
  </div>
</template>
