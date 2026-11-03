<script setup lang="ts">
import { computed } from 'vue'

import {
  answerClipboardImport,
  clipboardImportPrompt
} from '@/app/editor/clipboard/paste/import-prompt'
import { useHeldContent } from '@/components/ui/overlay/held'

import ClipboardImportDialog from './ClipboardImportDialog.vue'

/** The question for a paste of layers that use another document's variables or styles. */
const prompt = useHeldContent(clipboardImportPrompt)
const open = computed(() => clipboardImportPrompt.value !== null)
</script>

<template>
  <ClipboardImportDialog
    :open="open"
    :plan="prompt?.plan ?? { collections: [], styles: [] }"
    :question-id="prompt?.id"
    @answer="answerClipboardImport"
  />
</template>
