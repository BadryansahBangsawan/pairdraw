<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, shallowRef } from 'vue'

import {
  useDocumentWorkspace,
  type DocumentWorkspaceSource
} from '@open-pencil/vue/document/workspace'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import type { DraftMeta } from '@/app/document/drafts'
import { useDocumentSelection } from '@/app/home/selection'
import { useDateFormat } from '@/app/i18n/date'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import DocumentSelectionBar from '@/components/home/document/DocumentSelectionBar.vue'
import type { DocumentEntryAction } from '@/components/home/document/types'
import { useDocumentEntryMenu } from '@/components/home/document/useDocumentEntryMenu'
import { useDocumentListKeys } from '@/components/home/document/useDocumentListKeys'
import DraftDeleteDialog from '@/components/home/drafts/DraftDeleteDialog.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppSkeleton from '@/components/ui/feedback/AppSkeleton.vue'
import { skeleton } from '@/components/ui/feedback/skeleton'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import documentsTheme from '@/theme/home/documents'

/**
 * The drafts on Home: new designs this device keeps until they are saved somewhere, as a grid or
 * a list. Cmd/Ctrl+click and Shift+click select drafts to open or delete together.
 */
const { source, available, query } = defineProps<{
  /** Where the drafts are listed from: this device's local store in the app. */
  source: DocumentWorkspaceSource<DraftMeta>
  /** Whether new designs are kept as drafts here; when not, the empty list says so. */
  available: boolean
  /** Home's search, already lowercased in the app's locale. */
  query: string
}>()
const emit = defineEmits<{
  open: [draft: DraftMeta]
  /** Open these drafts, in this order. */
  openMany: [drafts: DraftMeta[]]
  saveAs: [draft: DraftMeta]
}>()
const view = defineModel<'grid' | 'list'>('view', { required: true })

const { recovery, files, common, panels, locale } = useI18n()
const { isTouch } = useViewportKind()
const dates = useDateFormat()
const styles = tv(documentsTheme)()
const loading = skeleton()

// Home passes one source for the section's life, so it is read once.
const workspace = useDocumentWorkspace<DraftMeta>({ source })
const vDraftPreview = workspace.previewDirective
const allDrafts = workspace.documents
const drafts = computed(() =>
  query
    ? allDrafts.value.filter((draft) => draft.name.toLocaleLowerCase(locale.value).includes(query))
    : allDrafts.value
)

const selection = useDocumentSelection(() => drafts.value.map((draft) => draft.id))
const selectedDrafts = computed(() => drafts.value.filter((draft) => selection.has(draft.id)))
const onKeydown = useDocumentListKeys(selection)
const deleting = shallowRef<readonly DraftMeta[]>([])

const entryMenu = useDocumentEntryMenu()
function menu(draft: DraftMeta) {
  return entryMenu(draft.name, {
    selected: selection.has(draft.id),
    saveAs: true,
    delete: true,
    deleteDraft: true
  })
}

function act(draft: DraftMeta, action: DocumentEntryAction) {
  if (action === 'select' || action === 'deselect') selection.select(draft.id, 'toggle')
  else if (action === 'save-as') emit('saveAs', draft)
  else if (action === 'delete') deleting.value = [draft]
}

function open(draft: DraftMeta) {
  selection.clear()
  emit('open', draft)
}

function openSelected() {
  const opening = selectedDrafts.value
  selection.clear()
  emit('openMany', opening)
}

// The selection stays until the drafts are gone, so cancelling keeps it.
function deleteSelected() {
  deleting.value = selectedDrafts.value
}
</script>

<template>
  <section :class="styles.section()" data-test-id="home-drafts" @keydown="onKeydown">
    <div :class="styles.header()">
      <div :class="styles.heading()">
        <h1 :class="styles.title()">{{ recovery.drafts }}</h1>
        <p :class="styles.description()">{{ recovery.draftsDescription }}</p>
      </div>
      <div :class="styles.actions()">
        <IconButton
          :label="common.refresh"
          :size="isTouch ? 'lg' : 'sm'"
          @click="workspace.refresh"
        >
          <icon-lucide-refresh-cw class="size-3.5" />
        </IconButton>
        <SegmentedControl
          v-model="view"
          required
          :label="recovery.drafts"
          :size="isTouch ? 'touch' : 'md'"
          :options="[
            { value: 'grid', label: panels.gridView },
            { value: 'list', label: panels.listView }
          ]"
        >
          <template #option="{ option }">
            <icon-lucide-layout-grid v-if="option.value === 'grid'" class="size-3.5" />
            <icon-lucide-list v-else class="size-3.5" />
          </template>
        </SegmentedControl>
      </div>
    </div>

    <DocumentSelectionBar
      v-if="selection.count.value > 0"
      :count="selection.count.value"
      :total="drafts.length"
      @select-all="selection.selectAll"
      @clear="selection.clear"
    >
      <AppButton variant="outline" @click="openSelected">
        <template #leading><icon-lucide-folder-open /></template>
        {{ files.openSelectedDocuments }}
      </AppButton>
      <AppButton variant="outline" @click="deleteSelected">
        <template #leading><icon-lucide-trash-2 /></template>
        {{ recovery.deleteDraft }}
      </AppButton>
    </DocumentSelectionBar>

    <div
      v-if="workspace.loading.value && !workspace.lastRefreshedAt.value"
      :class="[styles.grid(), loading.group()]"
      role="status"
      :aria-label="recovery.loadingDrafts"
    >
      <div v-for="index in 3" :key="index" :class="styles.skeleton()">
        <AppSkeleton :class="styles.skeletonPreview()" />
        <AppSkeleton :class="styles.skeletonName()" />
        <AppSkeleton :class="styles.skeletonMeta()" />
      </div>
    </div>

    <div
      v-else-if="workspace.error.value && allDrafts.length === 0"
      :class="styles.error()"
      role="alert"
    >
      <p :class="styles.errorText()">{{ String(workspace.error.value) }}</p>
      <AppButton variant="outline" :class="styles.errorAction()" @click="workspace.refresh">
        {{ common.refresh }}
      </AppButton>
    </div>

    <div v-else-if="drafts.length && view === 'grid'" :class="styles.grid()">
      <DocumentEntry
        v-for="draft in drafts"
        :key="draft.id"
        v-draft-preview="draft.id"
        :name="draft.name"
        :metadata="dates.format(draft.updatedAt, 'dateTime')"
        :previewURL="workspace.previewURL(draft.id)"
        :menu="menu(draft)"
        selectable
        :selected="selection.has(draft.id)"
        @open="open(draft)"
        @select="selection.select(draft.id, $event)"
        @action="act(draft, $event)"
      />
    </div>

    <div v-else-if="drafts.length" :class="styles.list()">
      <DocumentEntry
        v-for="draft in drafts"
        :key="draft.id"
        view="list"
        :name="draft.name"
        :metadata="dates.format(draft.updatedAt, 'dateTime')"
        :menu="menu(draft)"
        selectable
        :selected="selection.has(draft.id)"
        @open="open(draft)"
        @select="selection.select(draft.id, $event)"
        @action="act(draft, $event)"
      />
    </div>

    <AppPlaceholder
      v-else-if="!query"
      size="page"
      label-as="h2"
      :label="available ? recovery.noDrafts : recovery.draftsOff"
      :description="available ? recovery.noDraftsDescription : recovery.draftsOffDescription"
      :ui="{ root: styles.empty() }"
    >
      <template #icon><icon-lucide-file-pen-line class="size-5" /></template>
    </AppPlaceholder>

    <p v-else :class="styles.empty()">{{ files.noMatchingFiles({ query }) }}</p>

    <DraftDeleteDialog v-model:drafts="deleting" />
  </section>
</template>
