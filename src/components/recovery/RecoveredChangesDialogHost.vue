<script setup lang="ts">
import { tryOnScopeDispose } from '@vueuse/core'
import { computed, shallowRef } from 'vue'

import { useRecoveryMessages } from '@open-pencil/vue/i18n'

import {
  discardRecoveredChanges,
  offerRecoveredChanges,
  postponeRecoveredChanges,
  recoveredChanges,
  saveRecoveredChanges,
  saveRecoveredChangesAs,
  type RecoveredChanges
} from '@/app/document/recovery/recovered'
import { useDateFormat } from '@/app/i18n/date'
import { toast } from '@/app/shell/ui'
import { onFileOpened } from '@/app/tabs/open/events'
import { useHeldContent } from '@/components/ui/overlay/held'

import RecoveredChangesDialog from './RecoveredChangesDialog.vue'

/** Offers the backup of each file that opens with changes it never got, one file at a time. */
const recovery = useRecoveryMessages()
const dates = useDateFormat()
const prompt = useHeldContent(recoveredChanges)
const open = computed(() => recoveredChanges.value !== null)
const busy = shallowRef(false)

const subscription = onFileOpened((opened) => {
  void offerRecoveredChanges(opened).catch((error: unknown) => {
    console.warn('[Recovery] Looking for a backup of the opened file failed:', error)
  })
})
tryOnScopeDispose(subscription.off)

async function answer(run: (entry: RecoveredChanges) => Promise<unknown>): Promise<void> {
  const entry = recoveredChanges.value
  if (!entry || busy.value) return
  busy.value = true
  try {
    await run(entry)
  } catch (error) {
    toast.error(
      recovery.value.recoveredChangesFailed({
        error: error instanceof Error ? error.message : String(error)
      })
    )
  } finally {
    busy.value = false
  }
}

function later(): void {
  const entry = recoveredChanges.value
  if (entry) postponeRecoveredChanges(entry)
}
</script>

<template>
  <RecoveredChangesDialog
    :open="open"
    :document-name="prompt?.store.state.documentName ?? ''"
    :backed-up-at="prompt ? dates.format(prompt.backup.updatedAt, 'dateTime') : ''"
    :busy="busy"
    :question-id="prompt?.backup.id"
    @save="answer(saveRecoveredChanges)"
    @save-as="answer(saveRecoveredChangesAs)"
    @discard="answer(discardRecoveredChanges)"
    @later="later"
  />
</template>
