<script setup lang="ts">
import { computed } from 'vue'

import { answerDiskChangePrompt, diskChangePrompt } from '@/app/document/io/watch/prompt'
import { useHeldContent } from '@/components/ui/overlay/held'

import DiskChangeDialog from './DiskChangeDialog.vue'

/** The question for whichever open document's file changed on disk with unsaved edits. */
const prompt = useHeldContent(diskChangePrompt)
const open = computed(() => diskChangePrompt.value !== null)
</script>

<template>
  <DiskChangeDialog
    :open="open"
    :document-name="prompt?.documentName ?? ''"
    :question-id="prompt?.id"
    @reload="answerDiskChangePrompt('reload')"
    @ignore="answerDiskChangePrompt('ignore')"
  />
</template>
