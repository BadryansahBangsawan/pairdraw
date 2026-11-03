<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, shallowRef } from 'vue'

import type { useDocumentWorkspace } from '@open-pencil/vue/document/workspace'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { useDocumentSelection } from '@/app/home/selection'
import { useDateFormat } from '@/app/i18n/date'
import type { StorageDocument, StorageLocation } from '@/app/integrations/storage'
import { useCredentialSettings } from '@/app/settings/credentials/preferences/use'
import { openSettingsDialog } from '@/app/settings/dialog'
import DocumentDeleteDialog from '@/components/home/document/DocumentDeleteDialog.vue'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import DocumentSelectionBar from '@/components/home/document/DocumentSelectionBar.vue'
import type { DocumentEntryAction } from '@/components/home/document/types'
import { useDocumentEntryMenu } from '@/components/home/document/useDocumentEntryMenu'
import { useDocumentListKeys } from '@/components/home/document/useDocumentListKeys'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppSkeleton from '@/components/ui/feedback/AppSkeleton.vue'
import { skeleton } from '@/components/ui/feedback/skeleton'
import documentsTheme from '@/theme/home/documents'

type StorageWorkspace = ReturnType<typeof useDocumentWorkspace<StorageDocument>>

/**
 * The documents of the configured storage bucket, as a grid or a list. Cmd/Ctrl+click and
 * Shift+click select documents to open or delete together.
 */
const { workspace, documents, configured, description, location, query } = defineProps<{
  workspace: StorageWorkspace
  /** The documents to show: the bucket's, narrowed by Home's search. */
  documents: readonly StorageDocument[]
  configured: boolean
  /** The provider and bucket, under the heading. */
  description: string
  location: StorageLocation
  /** Home's search, already lowercased in the app's locale. */
  query: string
}>()
const emit = defineEmits<{
  open: [document: StorageDocument]
  /** Open these documents, in this order. */
  openMany: [documents: StorageDocument[]]
  saveAs: [document: StorageDocument]
}>()
const view = defineModel<'grid' | 'list'>('view', { required: true })

const { storage, common, settings, credentials, files } = useI18n()
const { isTouch } = useViewportKind()
const dates = useDateFormat()
const styles = tv(documentsTheme)()
const loading = skeleton()
const previewURL = workspace.previewURL
const vStoragePreview = workspace.previewDirective
const allDocuments = workspace.documents
const workspaceLoading = workspace.loading

// Paused credential access has its own fix, so the card offers it instead of the raw native error.
const credentialAccess = useCredentialSettings()
async function retryCredentialAccess() {
  await credentialAccess.retry()
  if (!credentialAccess.paused.value) await workspace.refresh()
}
const error = computed(() => {
  const cause = workspace.error.value
  if (cause == null) return null
  return cause instanceof Error ? cause.message : String(cause)
})

const selection = useDocumentSelection(() => documents.map((document) => document.id))
const selectedDocuments = computed(() => documents.filter((document) => selection.has(document.id)))
const onKeydown = useDocumentListKeys(selection)
const deleting = shallowRef<readonly StorageDocument[]>([])

/** A file's last change; a file that never reported one shows nothing. */
function formattedDate(updatedAt: string): string {
  return Date.parse(updatedAt) === 0 ? '' : dates.format(updatedAt, 'dateTime')
}

const entryMenu = useDocumentEntryMenu()
function menu(document: StorageDocument) {
  return entryMenu(document.name, {
    selected: selection.has(document.id),
    saveAs: true,
    delete: true
  })
}

function act(document: StorageDocument, action: DocumentEntryAction) {
  if (action === 'select' || action === 'deselect') selection.select(document.id, 'toggle')
  else if (action === 'save-as') emit('saveAs', document)
  else if (action === 'delete') deleting.value = [document]
}

function open(document: StorageDocument) {
  selection.clear()
  emit('open', document)
}

function openSelected() {
  const opening = selectedDocuments.value
  selection.clear()
  emit('openMany', opening)
}

// The selection stays until the documents are gone, so cancelling keeps it.
function deleteSelected() {
  deleting.value = selectedDocuments.value
}
</script>

<template>
  <section :class="styles.section()" @keydown="onKeydown">
    <div :class="styles.header()">
      <div :class="styles.heading()">
        <h2 :class="styles.title()">{{ storage.workspace }}</h2>
        <p :class="styles.description()">{{ description }}</p>
      </div>
      <div :class="styles.actions()">
        <IconButton
          :label="common.refresh"
          :size="isTouch ? 'lg' : 'sm'"
          @click="workspace.refresh"
        >
          <icon-lucide-refresh-cw class="size-3.5" />
        </IconButton>
        <IconButton
          :label="settings.title"
          :size="isTouch ? 'lg' : 'sm'"
          @click="openSettingsDialog('storage')"
        >
          <icon-lucide-settings-2 class="size-3.5" />
        </IconButton>
      </div>
    </div>

    <DocumentSelectionBar
      v-if="selection.count.value > 0"
      :count="selection.count.value"
      :total="documents.length"
      @select-all="selection.selectAll"
      @clear="selection.clear"
    >
      <AppButton variant="outline" @click="openSelected">
        <template #leading><icon-lucide-folder-open /></template>
        {{ files.openSelectedDocuments }}
      </AppButton>
      <AppButton variant="outline" @click="deleteSelected">
        <template #leading><icon-lucide-trash-2 /></template>
        {{ files.deleteDocument }}
      </AppButton>
    </DocumentSelectionBar>

    <div
      v-if="workspaceLoading && allDocuments.length === 0"
      :class="[styles.grid(), loading.group()]"
      role="status"
      :aria-label="storage.loadingWorkspace"
    >
      <div v-for="index in 3" :key="index" :class="styles.skeleton()">
        <AppSkeleton :class="styles.skeletonPreview()" />
        <AppSkeleton :class="styles.skeletonName()" />
        <AppSkeleton :class="styles.skeletonMeta()" />
      </div>
    </div>

    <div v-else-if="error && allDocuments.length === 0" :class="styles.error()" role="alert">
      <template v-if="credentialAccess.paused.value">
        <p :class="styles.errorText()">{{ credentials.accessPaused }}</p>
        <AppButton
          variant="outline"
          :class="styles.errorAction()"
          :loading="credentialAccess.busy.value"
          data-test-id="home-storage-retry-access"
          @click="retryCredentialAccess"
        >
          {{ credentials.retryAccess }}
        </AppButton>
      </template>
      <template v-else>
        <p :class="styles.errorText()">{{ error }}</p>
        <AppButton variant="outline" :class="styles.errorAction()" @click="workspace.refresh">
          {{ common.refresh }}
        </AppButton>
      </template>
    </div>

    <div v-else-if="documents.length && view === 'grid'" :class="styles.grid()">
      <DocumentEntry
        v-for="document in documents"
        :key="document.id"
        v-storage-preview="document.id"
        :name="document.name"
        :metadata="formattedDate(document.updatedAt)"
        :previewURL="previewURL(document.id)"
        :menu="menu(document)"
        selectable
        :selected="selection.has(document.id)"
        @open="open(document)"
        @select="selection.select(document.id, $event)"
        @action="act(document, $event)"
      />
    </div>

    <div v-else-if="documents.length" :class="styles.list()">
      <DocumentEntry
        v-for="document in documents"
        :key="document.id"
        view="list"
        :name="document.name"
        :metadata="formattedDate(document.updatedAt)"
        :menu="menu(document)"
        selectable
        :selected="selection.has(document.id)"
        @open="open(document)"
        @select="selection.select(document.id, $event)"
        @action="act(document, $event)"
      />
    </div>

    <div v-else-if="!configured" :class="styles.empty()">
      <p>{{ storage.notConfigured }}</p>
      <AppButton
        variant="outline"
        :class="styles.emptyAction()"
        @click="openSettingsDialog('storage')"
      >
        {{ settings.title }}
      </AppButton>
    </div>

    <div v-else-if="!query" :class="styles.empty()">
      {{ storage.emptyStorageWorkspace }}
    </div>
    <DocumentDeleteDialog v-model:documents="deleting" :location="location" />
  </section>
</template>
