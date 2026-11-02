<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core'
import { computed, ref, shallowRef, toRef, watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import type { AttachmentPresentation } from '@/app/ai/attachment/presentation/types'
import { AppDialogBody, AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'

const { attachment } = defineProps<{ attachment: AttachmentPresentation }>()
const { ai } = useI18n()
const viewerOpen = ref(false)
/** A text file shows its name on a tile, not a thumbnail of its text. */
const isFile = computed(() => attachment.kind === 'file')
const previewURL = useObjectUrl(
  toRef(() => (attachment.kind === 'file' ? undefined : attachment.preview))
)
/** A text file's contents, read when the viewer opens. */
const fileText = shallowRef<string | null>(null)
watch(viewerOpen, async (open) => {
  if (!open || attachment.kind !== 'file' || fileText.value !== null) return
  fileText.value = await attachment.preview.text()
})
const typeLabel = computed(() => {
  if (attachment.kind === 'file') return attachment.mediaType
  if (attachment.kind === 'image')
    return attachment.mediaType.split('/')[1]?.toUpperCase() ?? 'Image'
  return attachment.nodeType
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase())
})
const details = computed(() => {
  if (attachment.kind === 'file') {
    const size = Math.max(1, Math.round(attachment.size / 1024))
    return ai.value.fileAttachmentDetails({ type: typeLabel.value, size })
  }
  const { x, y } = attachment.originalSize
  return `${typeLabel.value} · ${Math.round(x)} × ${Math.round(y)}`
})
</script>

<template>
  <button
    type="button"
    :aria-label="ai.viewAttachment({ name: attachment.name })"
    :data-attachment-kind="attachment.kind"
    class="block overflow-hidden rounded-lg border border-border bg-panel-field text-left shadow-xs transition-colors hover:border-muted focus-visible:outline-2 focus-visible:outline-panel-focus"
    @click="viewerOpen = true"
  >
    <!-- The button names the attachment; its thumbnail and caption need no second name. -->
    <span
      v-if="isFile"
      class="flex h-20 w-28 items-center justify-center border-b border-border bg-canvas text-muted"
    >
      <icon-lucide-file-text class="size-6" aria-hidden="true" />
    </span>
    <img
      v-else-if="previewURL"
      :src="previewURL"
      alt=""
      class="h-20 w-28 border-b border-border bg-canvas object-contain"
    />
    <span class="block max-w-28 truncate px-1.5 py-1 text-[9px] leading-tight text-surface">
      {{ attachment.name }}
    </span>
  </button>

  <AppDialogRoot v-model:open="viewerOpen" size="xl">
    <AppDialogHeader
      :heading="attachment.name"
      :description="ai.attachmentPreview"
      :close-label="ai.closeAttachmentPreview"
    />
    <AppDialogBody v-if="isFile" class="min-h-0 overflow-auto bg-canvas p-4">
      <pre
        class="max-h-[75vh] font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-surface select-text"
        >{{ fileText ?? '' }}</pre>
    </AppDialogBody>
    <AppDialogBody v-else class="flex min-h-0 items-center justify-center bg-canvas p-4">
      <img
        v-if="previewURL"
        :src="previewURL"
        :alt="attachment.name"
        class="max-h-[75vh] max-w-full object-contain"
      />
    </AppDialogBody>
    <div class="border-t border-border px-4 py-2 text-xs text-muted">
      {{ details }}
    </div>
  </AppDialogRoot>
</template>
