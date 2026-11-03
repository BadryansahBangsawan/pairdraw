<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, useId } from 'vue'

import { useCloudMessages } from '@open-pencil/vue/i18n'

import { downloadSharedLinkTab, sharedLinkTabs } from '@/app/cloud/sharing/viewers'
import { useEditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import cloudShareTheme from '@/theme/cloud/share'

/**
 * What a tab opened from someone's link may do with the document, beside its name, and the
 * document as a `.fig` download: a snapshot as it was shared, a live document as its server holds
 * it now.
 */
const store = useEditorStore()
const t = useCloudMessages()
const ui = tv(cloudShareTheme)()
const shared = computed(() => sharedLinkTabs.value.get(store) ?? null)
const downloading = ref(false)
// The detail shows on hover in a tip, and reaches keyboard and screen-reader users as the label's
// description, since the label takes focus.
const detailId = useId()

const label = computed(() => {
  const tab = shared.value
  if (!tab) return ''
  if (tab.kind === 'snapshot') return t.value.sharedSnapshot
  if (tab.kind === 'public' || tab.permission === 'view') return t.value.viewOnly
  return tab.permission === 'comment' ? t.value.canComment : t.value.canEdit
})
const detail = computed(() => {
  const tab = shared.value
  if (!tab) return ''
  if (tab.kind === 'snapshot') return t.value.sharedSnapshotDetail
  if (tab.kind === 'public') return t.value.sharedPublicDetail
  return {
    view: t.value.sharedViewDetail,
    comment: t.value.sharedCommentDetail,
    edit: t.value.sharedEditDetail
  }[tab.permission]
})

async function download() {
  downloading.value = true
  try {
    await downloadSharedLinkTab(store)
  } catch {
    toast.error(t.value.downloadFigFailed)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div v-if="shared" :class="ui.sharedStatus()" data-test-id="cloud-shared-link-status">
    <Tip :label="detail" as-child>
      <span :class="ui.sharedLabel()" tabindex="0" :aria-describedby="detailId">
        <icon-lucide-camera v-if="shared.kind === 'snapshot'" class="size-3" />
        <icon-lucide-message-circle v-else-if="shared.permission === 'comment'" class="size-3" />
        <icon-lucide-eye v-else class="size-3" />
        {{ label }}
      </span>
    </Tip>
    <span :id="detailId" :class="ui.sharedDetail()">{{ detail }}</span>
    <AppButton
      variant="outline"
      size="sm"
      :loading="downloading"
      data-test-id="cloud-shared-link-download"
      @click="download"
    >
      <template #leading><icon-lucide-download class="size-3.5" /></template>
      {{ t.downloadFig }}
    </AppButton>
  </div>
</template>
