<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useCloudMessages, useCommonMessages, useFileMessages } from '@open-pencil/vue/i18n'

import { formatStorageBytes } from '@/app/storage/format-bytes'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppBadge from '@/components/ui/feedback/AppBadge.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppProgress from '@/components/ui/feedback/AppProgress.vue'
import AppSkeleton from '@/components/ui/feedback/AppSkeleton.vue'
import { skeleton } from '@/components/ui/feedback/skeleton'
import Tip from '@/components/ui/overlay/Tip.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import documentsTheme from '@/theme/home/documents'

import CloudSyncIcon from './CloudSyncIcon.vue'
import type { CloudDocumentRow } from './types'

/**
 * One Cloud workspace on the home tab: its files with where each stands against the server, how
 * much of the workspace's storage they use, and what needs attention.
 */
const {
  heading,
  subtitle,
  role = null,
  documents,
  usage = null,
  state = 'ready',
  canCreate = false,
  canDelete = false
} = defineProps<{
  heading: string
  subtitle?: string
  /** The person's role in the workspace, when it is a workspace rather than a shared list. */
  role?: string | null
  documents: CloudDocumentRow[]
  usage?: { usedBytes: number; totalBytes: number | null } | null
  state?: 'loading' | 'ready' | 'offline' | 'error'
  /** The person may create designs here. */
  canCreate?: boolean
  /** The person may delete the designs listed here. */
  canDelete?: boolean
}>()

const view = defineModel<'grid' | 'list'>('view', { default: 'grid' })
const emit = defineEmits<{
  open: [document: CloudDocumentRow]
  delete: [document: CloudDocumentRow]
  newDesign: []
  members: []
  refresh: []
  reviewConflicts: []
}>()

const t = useCloudMessages()
const common = useCommonMessages()
const files = useFileMessages()
const { isTouch } = useViewportKind()
const styles = tv(documentsTheme)()
const loading = skeleton()
const menu = (document: CloudDocumentRow) =>
  canDelete
    ? {
        actions: files.value.documentActions({ name: document.name }),
        delete: files.value.deleteDocument
      }
    : undefined
const conflicts = computed(() => documents.filter((document) => document.sync === 'conflict'))
const usageLabel = computed(() => {
  if (!usage) return null
  const used = formatStorageBytes(usage.usedBytes)
  return usage.totalBytes === null
    ? t.value.homeUsageUsed({ used })
    : t.value.homeUsageOf({ used, total: formatStorageBytes(usage.totalBytes) })
})
const metadata = (document: CloudDocumentRow) =>
  document.editedBy ? `${document.editedAt} · ${document.editedBy}` : document.editedAt
</script>

<template>
  <section :class="styles.section()">
    <header :class="styles.header()">
      <div :class="styles.heading()">
        <div :class="styles.titleRow()">
          <h1 :class="styles.title()">{{ heading }}</h1>
          <AppBadge v-if="role">{{ role }}</AppBadge>
        </div>
        <div v-if="subtitle || usageLabel" :class="styles.details()">
          <span v-if="subtitle">{{ subtitle }}</span>
          <span v-if="subtitle && usageLabel" aria-hidden="true">·</span>
          <template v-if="usage && usage.totalBytes !== null && usageLabel">
            <AppProgress
              :amount="{ value: usage.usedBytes, max: usage.totalBytes }"
              :aria-label="t.homeWorkspaceStorage({ usage: usageLabel })"
              :ui="{ root: 'w-16' }"
            />
            <span>{{ usageLabel }}</span>
          </template>
          <span v-else-if="usageLabel">{{ usageLabel }}</span>
        </div>
      </div>
      <div :class="styles.actions()">
        <AppButton v-if="role" size="sm" variant="ghost" @click="emit('members')">
          <template #leading><icon-lucide-users class="size-3.5" /></template>
          {{ t.homeMembers }}
        </AppButton>
        <IconButton :label="common.refresh" :size="isTouch ? 'lg' : 'sm'" @click="emit('refresh')">
          <icon-lucide-refresh-cw class="size-3.5" />
        </IconButton>
        <SegmentedControl
          v-model="view"
          required
          :label="t.homeView"
          :options="[
            { value: 'grid', label: t.homeGrid },
            { value: 'list', label: t.homeList }
          ]"
        >
          <template #option="{ option }">
            <icon-lucide-layout-grid v-if="option.value === 'grid'" class="size-3.5" />
            <icon-lucide-list v-else class="size-3.5" />
          </template>
        </SegmentedControl>
      </div>
    </header>

    <AppAlert
      v-if="state === 'offline'"
      tone="info"
      :heading="t.homeOfflineHeading"
      :description="t.homeOfflineDescription"
    />
    <AppAlert
      v-else-if="state === 'error'"
      tone="error"
      :heading="t.homeLoadFailedHeading"
      :description="t.homeLoadFailedDescription"
    >
      <template #actions>
        <AppButton size="sm" variant="outline" @click="emit('refresh')">{{ t.tryAgain }}</AppButton>
      </template>
    </AppAlert>
    <AppAlert
      v-if="conflicts.length"
      tone="warning"
      :heading="
        conflicts.length === 1
          ? t.changedInTwoPlaces({ name: conflicts[0]?.name ?? '' })
          : t.homeConflicts(conflicts.length)
      "
      :description="t.conflictDescription"
    >
      <template #actions>
        <AppButton size="sm" variant="outline" @click="emit('reviewConflicts')">{{
          t.homeReview
        }}</AppButton>
      </template>
    </AppAlert>

    <div
      v-if="state === 'loading'"
      :class="[styles.grid(), loading.group()]"
      :aria-label="t.homeLoadingFiles"
    >
      <div v-for="index in 4" :key="index" :class="styles.skeleton()">
        <AppSkeleton :class="styles.skeletonPreview()" />
        <AppSkeleton :class="styles.skeletonName()" />
        <AppSkeleton :class="styles.skeletonMeta()" />
      </div>
    </div>

    <AppPlaceholder
      v-else-if="documents.length === 0"
      size="page"
      label-as="h2"
      :label="role ? t.homeEmptyWorkspace({ workspace: heading }) : t.homeNothingShared"
      :description="role ? t.homeEmptyWorkspaceDescription : t.homeNothingSharedDescription"
      :ui="{ root: styles.empty() }"
    >
      <template #icon><icon-lucide-layers class="size-5" /></template>
      <template v-if="canCreate" #action>
        <AppButton color="primary" variant="solid" @click="emit('newDesign')">
          <template #leading><icon-lucide-plus class="size-3.5" /></template>
          {{ t.homeNewDesign }}
        </AppButton>
      </template>
    </AppPlaceholder>

    <div v-else :class="view === 'grid' ? styles.grid() : styles.list()">
      <DocumentEntry
        v-for="document in documents"
        :key="document.id"
        :view="view"
        :name="document.name"
        :metadata="metadata(document)"
        :previewURL="document.previewURL"
        :menu="menu(document)"
        @open="emit('open', document)"
        @delete="emit('delete', document)"
      >
        <template #status>
          <Tip v-if="document.permission === 'view'" :label="t.homeViewOnlyTip">
            <icon-lucide-eye class="size-3" role="img" :aria-label="t.viewOnly" />
          </Tip>
          <Tip v-if="document.shared" :label="t.homeSharedTip">
            <icon-lucide-users class="size-3" role="img" :aria-label="t.homeShared" />
          </Tip>
          <CloudSyncIcon :state="document.sync" />
        </template>
      </DocumentEntry>
    </div>
  </section>
</template>
