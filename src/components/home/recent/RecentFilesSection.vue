<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { useDateFormat } from '@/app/i18n/date'
import { clearRecentFiles, type RecentDocument } from '@/app/recent-files'
import type { RecentFilesWorkspace } from '@/app/recent-files/workspace'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import documentsTheme from '@/theme/home/documents'

/** The recent files, as a grid or a list, with the files `documents` keeps of them. */
const { workspace, documents, query } = defineProps<{
  workspace: RecentFilesWorkspace
  documents: readonly RecentDocument[]
  query: string
}>()
const emit = defineEmits<{ open: [document: RecentDocument] }>()
const view = defineModel<'grid' | 'list'>('view', { required: true })
const { panels, files, common } = useI18n()
const { isTouch } = useViewportKind()
const dates = useDateFormat()
const previewURL = workspace.previewURL
const vWorkspacePreview = workspace.previewDirective
const hasRecentFiles = computed(() => workspace.documents.value.length > 0)
const styles = tv(documentsTheme)()

/** A file's last change; a file that never reported one shows nothing. */
function formattedDate(updatedAt: string): string {
  return Date.parse(updatedAt) === 0 ? '' : dates.format(updatedAt, 'dateTime')
}
</script>

<template>
  <section :class="styles.section()">
    <div :class="styles.header()">
      <div :class="styles.heading()">
        <h1 :class="styles.title()">{{ files.recentFiles }}</h1>
        <p :class="styles.description()">{{ files.recentFilesDescription }}</p>
      </div>
      <div :class="styles.actions()">
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

    <div v-if="documents.length && view === 'grid'" :class="styles.grid()">
      <DocumentEntry
        v-for="document in documents"
        :key="document.id"
        v-workspace-preview="document.id"
        :name="document.name"
        :metadata="formattedDate(document.updatedAt)"
        :previewURL="previewURL(document.id)"
        @open="emit('open', document)"
      />
    </div>

    <div v-else-if="documents.length" :class="styles.list()">
      <DocumentEntry
        v-for="document in documents"
        :key="document.id"
        view="list"
        :name="document.name"
        :metadata="formattedDate(document.updatedAt)"
        @open="emit('open', document)"
      />
    </div>

    <div v-else-if="!query" :class="styles.empty()">
      <p :class="styles.emptyTitle()">{{ files.noRecentFiles }}</p>
      <p :class="styles.emptyDescription()">{{ files.noRecentFilesDescription }}</p>
    </div>
  </section>
</template>
