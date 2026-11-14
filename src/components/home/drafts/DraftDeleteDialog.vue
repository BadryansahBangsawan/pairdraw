<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'

import { useCommonMessages, useRecoveryMessages } from '@pairdraw/vue/i18n'

import type { DraftMeta } from '@/app/document/drafts'
import { toast } from '@/app/shell/ui'
import { deleteDraftEverywhere } from '@/app/tabs/open/draft'
import { AppConfirmationDialog } from '@/components/ui/dialog'

/** Asks before drafts are deleted; a draft lives only on this device, so nothing brings it back. */
const drafts = defineModel<readonly DraftMeta[]>('drafts', { default: () => [] })
const recovery = useRecoveryMessages()
const common = useCommonMessages()

// The dialog closes itself before it confirms, and keeps its heading while it animates closed,
// so it holds the drafts it was asked about apart from the model.
const open = ref(false)
const targets = shallowRef<readonly DraftMeta[]>([])
watch(
  drafts,
  (next) => {
    if (next.length === 0) return
    targets.value = next
    open.value = true
  },
  { immediate: true }
)
watch(open, (value) => {
  if (!value && drafts.value.length > 0) drafts.value = []
})

const heading = computed(() => {
  const [only] = targets.value
  return targets.value.length === 1 && only
    ? recovery.value.deleteDraftConfirmation({ name: only.name })
    : recovery.value.deleteDraftsConfirmation(targets.value.length)
})

// Home's list follows the drafts as they go, so the selection drops them too.
async function confirm() {
  for (const draft of targets.value) {
    try {
      await deleteDraftEverywhere(draft.id)
    } catch (error) {
      console.error('[Drafts] Deleting a draft failed:', error)
      toast.error(recovery.value.deleteDraftFailed({ name: draft.name }))
    }
  }
}
</script>

<template>
  <AppConfirmationDialog
    v-model:open="open"
    :heading="heading"
    :description="recovery.deleteDraftDescription"
    :cancel-label="common.cancel"
    :confirm-label="recovery.deleteDraft"
    tone="danger"
    @confirm="confirm"
  />
</template>
