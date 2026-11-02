<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { closeCanvasPrompt, offersCanvasPrompt } from '@/app/ai/chat/canvas-prompt'
import { sendPromptToDocument } from '@/app/ai/chat/pending-prompt'
import { ensureChatConfigured } from '@/app/ai/chat/setup'
import { useEditorStore } from '@/app/editor/active-store'
import ChatPromptComposer from '@/components/chat/ChatPromptComposer.vue'
import ChatPromptExamples from '@/components/chat/ChatPromptExamples.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'

/**
 * Over an empty page, an offer to start the AI chat from a prompt. It takes the pointer only on
 * its card, so the canvas around it still draws, and it leaves once the page has a layer or an
 * agent starts working on it.
 */
const store = useEditorStore()
const { ai } = useI18n()
const offered = computed(() => offersCanvasPrompt(store))
const prompt = ref('')
const starting = ref(false)
const composer = useTemplateRef('composer')

/** An example goes into the field to read and edit before it is sent. */
function pickExample(example: string) {
  prompt.value = example
  void composer.value?.focus()
}

/**
 * Sends the prompt into this document's chat. Without a model, the chat looks for a coding agent
 * on this computer first, and guided setup opens only when it finds none.
 */
async function start(text: string): Promise<void> {
  if (starting.value) return
  starting.value = true
  try {
    if (!(await ensureChatConfigured())) return
    closeCanvasPrompt(store)
    sendPromptToDocument(store, text)
    prompt.value = ''
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div
    v-if="offered"
    class="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
  >
    <section
      :aria-label="ai.canvasPromptTitle"
      class="pointer-events-auto relative w-full max-w-md animate-in rounded-card border border-border bg-panel elevation-card fade-in motion-reduce:animate-none"
    >
      <IconButton
        :label="ai.canvasPromptClose"
        size="sm"
        class="absolute end-2 top-2"
        @click="closeCanvasPrompt(store)"
      >
        <icon-lucide-x class="size-3.5" />
      </IconButton>
      <AppPlaceholder
        :label="ai.canvasPromptTitle"
        label-as="h2"
        :description="ai.canvasPromptDescription"
        :fill="false"
        :ui="{ content: 'max-w-none' }"
      >
        <template #icon><icon-lucide-sparkles class="size-4" /></template>
        <ChatPromptComposer
          ref="composer"
          v-model="prompt"
          :label="ai.promptStartLabel"
          :placeholder="ai.promptStartPlaceholder"
          :busy="starting"
          :rows="2"
          @submit="start"
        />
        <ChatPromptExamples :disabled="starting" class="mt-3" @pick="pickExample" />
      </AppPlaceholder>
    </section>
  </div>
</template>
