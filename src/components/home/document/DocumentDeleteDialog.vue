<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'

import { useCommonMessages, useFileMessages } from '@open-pencil/vue/i18n'

import type { StorageDocument, StorageLocation } from '@/app/integrations/storage'
import { toast } from '@/app/shell/ui'
import { deleteStoredDocument } from '@/app/storage/workspace/delete'
import { AppConfirmationDialog } from '@/components/ui/dialog'

/** Asks before stored documents are deleted for everyone who can open them. */
const { location } = defineProps<{ location: StorageLocation }>()
/** The documents to ask about; set them to ask, and they are cleared once the dialog closes. */
const documents = defineModel<readonly StorageDocument[]>('documents', { default: () => [] })
const files = useFileMessages()
const common = useCommonMessages()

// The dialog closes itself before it confirms, and keeps its heading while it animates closed,
// so it holds the documents it was asked about apart from the model.
const open = ref(false)
const targets = shallowRef<readonly StorageDocument[]>([])
watch(
  documents,
  (next) => {
    if (next.length === 0) return
    targets.value = next
    open.value = true
  },
  { immediate: true }
)
watch(open, (value) => {
  if (!value && documents.value.length > 0) documents.value = []
})

const heading = computed(() => {
  const [only] = targets.value
  return targets.value.length === 1 && only
    ? files.value.deleteDocumentConfirmation({ name: only.name })
    : files.value.deleteDocumentsConfirmation(targets.value.length)
})
const description = computed(() =>
  targets.value.length === 1
    ? files.value.deleteDocumentDescription
    : files.value.deleteDocumentsDescription
)

function confirm() {
  for (const deleting of targets.value) {
    void deleteStoredDocument(deleting, location).catch((error: unknown) => {
      console.error('[Storage] Deleting a document failed:', error)
      toast.error(files.value.deleteDocumentFailed({ name: deleting.name }))
    })
  }
}
</script>

<template>
  <AppConfirmationDialog
    v-model:open="open"
    :heading="heading"
    :description="description"
    :cancel-label="common.cancel"
    :confirm-label="files.deleteDocument"
    tone="danger"
    @confirm="confirm"
  />
</template>
