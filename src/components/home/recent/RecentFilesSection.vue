<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { canSaveDocumentCopy, recentCopySource } from '@/app/home/save-copy'
import { useDocumentSelection } from '@/app/home/selection'
import { useDateFormat } from '@/app/i18n/date'
import { clearRecentFiles, forgetRecentDocuments, type RecentDocument } from '@/app/recent-files'
import { recentFilesSort, sortRecentDocuments } from '@/app/recent-files/sort'
import type { RecentFilesWorkspace } from '@/app/recent-files/workspace'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import DocumentSelectionBar from '@/components/home/document/DocumentSelectionBar.vue'
import type { DocumentEntryAction } from '@/components/home/document/types'
import { useDocumentEntryMenu } from '@/components/home/document/useDocumentEntryMenu'
import { useDocumentListKeys } from '@/components/home/document/useDocumentListKeys'
import RecentFilesSortMenu from '@/components/home/recent/RecentFilesSortMenu.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import documentsTheme from '@/theme/home/documents'

/**
 * The recent files, as a grid or a list in the order picked, with the files `documents` keeps of
 * them. Cmd/Ctrl+click and Shift+click select files to open or remove from the list together.
 */
const { workspace, documents, query } = defineProps<{
  workspace: RecentFilesWorkspace
  documents: readonly RecentDocument[]
  query: string
}>()
const emit = defineEmits<{
  open: [document: RecentDocument]
  /** Open these documents, in this order. */
  openMany: [documents: RecentDocument[]]
  saveAs: [document: RecentDocument]
}>()
const view = defineModel<'grid' | 'list'>('view', { required: true })
const { panels, files, common, locale } = useI18n()
const { isTouch } = useViewportKind()
const dates = useDateFormat()
const previewURL = workspace.previewURL
const vWorkspacePreview = workspace.previewDirective
const hasRecentFiles = computed(() => workspace.documents.value.length > 0)
const styles = tv(documentsTheme)()

const sorted = computed(() => sortRecentDocuments(documents, recentFilesSort.value, locale.value))
const selection = useDocumentSelection(() => sorted.value.map((document) => document.id))
const selectedDocuments = computed(() =>
  sorted.value.filter((document) => selection.has(document.id))
)
const onKeydown = useDocumentListKeys(selection)

/**
 * The date the list is sorted by, so the dates read in order: when the file was added while
 * sorted by that, otherwise its last use. A file that never reported one shows nothing.
 */
function formattedDate(document: RecentDocument): string {
  const date = recentFilesSort.value === 'created' ? document.createdAt : document.updatedAt
  return Date.parse(date) === 0 ? '' : dates.format(date, 'dateTime')
}

const entryMenu = useDocumentEntryMenu()
function menu(document: RecentDocument) {
  return entryMenu(document.name, {
    selected: selection.has(document.id),
    saveAs: canSaveDocumentCopy(recentCopySource(document)),
    removeRecent: true
  })
}

function act(document: RecentDocument, action: DocumentEntryAction) {
  if (action === 'select' || action === 'deselect') selection.select(document.id, 'toggle')
  else if (action === 'save-as') emit('saveAs', document)
  else if (action === 'remove-recent') forgetRecentDocuments([document.id])
}

function open(document: RecentDocument) {
  selection.clear()
  emit('open', document)
}

function openSelected() {
  const documents = selectedDocuments.value
  selection.clear()
  emit('openMany', documents)
}

function removeSelected() {
  forgetRecentDocuments(selection.ordered.value)
  selection.clear()
}
</script>

<template>
  <section :class="styles.section()" @keydown="onKeydown">
    <div :class="styles.header()">
      <div :class="styles.heading()">
        <h1 :class="styles.title()">{{ files.recentFiles }}</h1>
        <p :class="styles.description()">{{ files.recentFilesDescription }}</p>
      </div>
      <div :class="styles.actions()">
        <RecentFilesSortMenu
          v-if="hasRecentFiles"
          v-model="recentFilesSort"
          :size="isTouch ? 'lg' : 'sm'"
        />
        <IconButton
          v-if="hasRecentFiles"
          :label="common.clear"
          :size="isTouch ? 'lg' : 'sm'"
          data-test-id="recent-files-clear"
          @click="clearRecentFiles"
        >
          <icon-lucide-trash-2 class="size-3.5" />
        </IconButton>
        <SegmentedControl
          v-model="view"
          required
          :label="files.recentFiles"
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
      :total="sorted.length"
      @select-all="selection.selectAll"
      @clear="selection.clear"
    >
      <AppButton variant="outline" @click="openSelected">
        <template #leading><icon-lucide-folder-open /></template>
        {{ files.openSelectedDocuments }}
      </AppButton>
      <AppButton variant="outline" @click="removeSelected">
        <template #leading><icon-lucide-clock-fading /></template>
        {{ files.removeFromRecents }}
      </AppButton>
    </DocumentSelectionBar>

    <div v-if="sorted.length && view === 'grid'" :class="styles.grid()">
      <DocumentEntry
        v-for="document in sorted"
        :key="document.id"
        v-workspace-preview="document.id"
        :name="document.name"
        :metadata="formattedDate(document)"
        :previewURL="previewURL(document.id)"
        :menu="menu(document)"
        selectable
        :selected="selection.has(document.id)"
        @open="open(document)"
        @select="selection.select(document.id, $event)"
        @action="act(document, $event)"
      />
    </div>

    <div v-else-if="sorted.length" :class="styles.list()">
      <DocumentEntry
        v-for="document in sorted"
        :key="document.id"
        view="list"
        :name="document.name"
        :metadata="formattedDate(document)"
        :menu="menu(document)"
        selectable
        :selected="selection.has(document.id)"
        @open="open(document)"
        @select="selection.select(document.id, $event)"
        @action="act(document, $event)"
      />
    </div>

    <div v-else-if="!query" :class="styles.empty()">
      <p :class="styles.emptyTitle()">{{ files.noRecentFiles }}</p>
      <p :class="styles.emptyDescription()">{{ files.noRecentFilesDescription }}</p>
    </div>
  </section>
</template>
