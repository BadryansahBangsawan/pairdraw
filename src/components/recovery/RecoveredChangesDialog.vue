<script setup lang="ts">
import { useFocus } from '@vueuse/core'
import { useTemplateRef, watch } from 'vue'

import { useRecoveryMessages } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlertDialogRoot from '@/components/ui/dialog/AppAlertDialogRoot.vue'
import AppDialogFooter from '@/components/ui/dialog/AppDialogFooter.vue'
import AppDialogHeader from '@/components/ui/dialog/AppDialogHeader.vue'
import { documentCloseButtonUI, documentCloseUI } from '@/theme/document/close'

/**
 * Offers the changes a file never got, kept as its backup, when the file opens again: save them
 * to the file, save them as a new file, or discard them. `open` stays with the caller; closing
 * the dialog here, such as with Escape, answers later.
 */
const {
  open,
  documentName,
  backedUpAt,
  busy = false,
  questionId
} = defineProps<{
  open: boolean
  documentName: string
  /** When the backup was taken, formatted for the person. */
  backedUpAt: string
  /** An answer is being carried out, so no other can start. */
  busy?: boolean
  /** Identifies the backup asked about; the next queued one moves focus back to Save. */
  questionId?: string
}>()
const emit = defineEmits<{ save: []; saveAs: []; discard: []; later: [] }>()

const recovery = useRecoveryMessages()
const saveButton = useTemplateRef('saveButton')

// Return saves the recovered changes, which keeps the work the person had not saved. The dialog
// stays open from one queued file to the next, so each new one refocuses Save once the answer
// before it is done and the buttons work again.
const { focused } = useFocus(saveButton, { initialValue: true, preventScroll: true })
watch(
  () => [questionId, busy] as const,
  ([, answering]) => {
    if (!answering) focused.value = true
  },
  { flush: 'post' }
)

function updateOpen(value: boolean) {
  if (!value && !busy) emit('later')
}
</script>

<template>
  <AppAlertDialogRoot :open="open" @update:open="updateOpen">
    <AppDialogHeader
      :heading="recovery.recoveredChangesTitle"
      :description="recovery.recoveredChangesDescription({ name: documentName, time: backedUpAt })"
      :show-close="false"
      :ui="documentCloseUI"
    />
    <AppDialogFooter :ui="documentCloseUI">
      <AppButton
        color="error"
        variant="ghost"
        class="mr-auto"
        :disabled="busy"
        @click="emit('discard')"
      >
        {{ recovery.discardRecovered }}
      </AppButton>
      <AppButton
        color="neutral"
        variant="outline"
        :ui="documentCloseButtonUI"
        :disabled="busy"
        @click="emit('saveAs')"
      >
        {{ recovery.saveRecoveredAs }}
      </AppButton>
      <AppButton
        ref="saveButton"
        color="primary"
        variant="solid"
        :ui="documentCloseButtonUI"
        :disabled="busy"
        @click="emit('save')"
      >
        {{ recovery.saveRecovered }}
      </AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
