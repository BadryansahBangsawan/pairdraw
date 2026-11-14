<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { useFocus } from '@vueuse/core'
import { useTemplateRef, watch } from 'vue'

import { filesMessages } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlertDialogRoot from '@/components/ui/dialog/AppAlertDialogRoot.vue'
import AppDialogFooter from '@/components/ui/dialog/AppDialogFooter.vue'
import AppDialogHeader from '@/components/ui/dialog/AppDialogHeader.vue'
import { documentCloseButtonUI, documentCloseUI } from '@/theme/document/close'

/**
 * Asks whether to reload a document whose file changed on disk while it has unsaved edits.
 * `open` stays with the caller, whose queue decides when the dialog closes; closing it here,
 * such as with Escape, only answers Ignore.
 */
const { open, documentName, questionId } = defineProps<{
  open: boolean
  documentName: string
  /** Identifies the question shown; a new one moves focus back to Ignore. */
  questionId?: number
}>()
const emit = defineEmits<{ reload: []; ignore: [] }>()

const files = useStore(filesMessages)
const ignoreButton = useTemplateRef('ignoreButton')

// Return keeps the person's edits; reloading discards them, so it is never the default. The
// dialog stays open from one queued question to the next, so each new question refocuses it.
const { focused } = useFocus(ignoreButton, { initialValue: true, preventScroll: true })
watch(
  () => questionId,
  () => {
    focused.value = true
  },
  { flush: 'post' }
)

function updateOpen(value: boolean) {
  if (!value) emit('ignore')
}
</script>

<template>
  <AppAlertDialogRoot :open="open" @update:open="updateOpen">
    <AppDialogHeader
      :heading="files.fileChangedOnDisk({ name: documentName })"
      :description="files.fileChangedOnDiskDescription"
      :show-close="false"
      :ui="documentCloseUI"
    />
    <AppDialogFooter :ui="documentCloseUI">
      <AppButton
        color="error"
        variant="ghost"
        class="mr-auto"
        :ui="documentCloseButtonUI"
        @click="emit('reload')"
      >
        {{ files.reloadFromDisk }}
      </AppButton>
      <AppButton
        ref="ignoreButton"
        color="primary"
        variant="solid"
        :ui="documentCloseButtonUI"
        @click="emit('ignore')"
      >
        {{ files.ignoreDiskChange }}
      </AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
