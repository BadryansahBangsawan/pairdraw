<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import type { LibrarySummary } from '@open-pencil/core/library'
import type { DocumentKind } from '@open-pencil/scene-graph'
import { useDocumentWorkspace } from '@open-pencil/vue/document/workspace'
import { useI18n } from '@open-pencil/vue/i18n'

import { agentAutoConnect } from '@/app/ai/agents/auto/session'
import { sendPromptToDocument } from '@/app/ai/chat/pending-prompt'
import { ensureChatConfigured } from '@/app/ai/chat/setup'
import { CLOUD_INCLUDED, CLOUD_STORAGE_PROVIDER_ID } from '@/app/cloud/integration'
import { draftsAvailable, draftsWorkspaceSource, type DraftMeta } from '@/app/document/drafts'
import { recoveryEnabled } from '@/app/document/recovery/preferences'
import { startDesignWith } from '@/app/home/design-systems'
import { useHomeLocations } from '@/app/home/locations'
import {
  canSaveDocumentCopy,
  recentCopySource,
  saveDocumentCopy,
  type DocumentCopyResult,
  type DocumentCopySource
} from '@/app/home/save-copy'
import { notificationMessages } from '@/app/i18n/notifications'
import {
  activeStorageProviderID,
  readStoragePreferences,
  storagePreferencesComplete,
  storageProviderRegistry,
  type StorageDocument,
  type StorageLocation
} from '@/app/integrations/storage'
import type { RecentDocument } from '@/app/recent-files'
import {
  matchingRecentFiles,
  openRecentDocument,
  useRecentFilesWorkspace
} from '@/app/recent-files/workspace'
import { toast } from '@/app/shell/ui'
import { createStoredDocument } from '@/app/storage/workspace/create'
import { activeStorageLocation, createStorageWorkspaceSource } from '@/app/storage/workspace/source'
import { createDocumentTab, openStorageDocumentInNewTab, type Tab } from '@/app/tabs'
import { openDraftInTab, saveDraftAs } from '@/app/tabs/open/draft'
import { CloudSharedSection, CloudWorkspaceSection } from '@/components/cloud/integration'
import DesignSystemsSection from '@/components/home/design-systems/DesignSystemsSection.vue'
import DraftsSection from '@/components/home/drafts/DraftsSection.vue'
import HomeLayout from '@/components/home/HomeLayout.vue'
import HomePromptComposer from '@/components/home/HomePromptComposer.vue'
import RecentFilesSection from '@/components/home/recent/RecentFilesSection.vue'
import HomeSearchActions from '@/components/home/search/HomeSearchActions.vue'
import HomeLocationMenu from '@/components/home/sidebar/HomeLocationMenu.vue'
import HomeSidebar from '@/components/home/sidebar/HomeSidebar.vue'
import StorageWorkspaceSection from '@/components/home/storage/StorageWorkspaceSection.vue'
import documentsTheme from '@/theme/home/documents'

const { ai, locale, storage, files, settings } = useI18n()
const view = useLocalStorage<'grid' | 'list'>('open-pencil:home-files-view', 'grid')
const query = ref('')
const openError = ref<string | null>(null)
const storageConfigured = ref(storagePreferencesComplete(activeStorageProviderID.value))
const places = useHomeLocations()
const styles = tv(documentsTheme)()

/** A new document lands in the place Home shows: a Cloud workspace, the bucket, or a local file. */
function newDocument(kind: DocumentKind): Tab {
  const target = newDesignTarget.value
  return target ? createStoredDocument(target.location, kind) : createDocumentTab(kind)
}

const prompt = ref('')
const startingFromPrompt = ref(false)
/** Says why the prompt has not gone yet while it looks for a coding agent on this computer. */
const promptStatus = computed(() =>
  startingFromPrompt.value && agentAutoConnect.state.phase === 'detecting'
    ? ai.value.chatAgentDetecting
    : null
)
/**
 * Starts a new design from the prompt, whose chat sends it once open. Without a model to send it
 * to, the chat looks for a coding agent on this computer first: one that needs a sign-in or an
 * install waits in the new design's chat column with the prompt. Without one, guided setup opens;
 * dismissing it keeps the prompt here and creates nothing.
 */
async function startFromPrompt(text: string): Promise<void> {
  if (startingFromPrompt.value) return
  startingFromPrompt.value = true
  try {
    if (!(await ensureChatConfigured())) return
    sendPromptToDocument(newDocument('design').store, text)
    prompt.value = ''
  } finally {
    startingFromPrompt.value = false
  }
}

const workspace = useRecentFilesWorkspace()

const documents = workspace.documents

const storageWorkspace = useDocumentWorkspace<StorageDocument>({
  source: createStorageWorkspaceSource((snapshot) => {
    storageConfigured.value = snapshot.configured
  }),
  refreshInterval: 60_000,
  previewConcurrency: 6
})
const storageDocuments = storageWorkspace.documents
const storageLocation = computed(() => activeStorageLocation())
const storageDescription = computed(() => {
  const provider = storageProviderRegistry.get(activeStorageProviderID.value)
  const preferences = readStoragePreferences(activeStorageProviderID.value)
  const bucket = preferences.bucket?.trim()
  const endpoint = preferences.endpoint?.trim()
  let label = provider.label
  if (endpoint) {
    try {
      const hostname = new URL(endpoint).hostname
      if (hostname.endsWith('.r2.cloudflarestorage.com')) label = storage.value.providerR2
      else if (hostname.includes('amazonaws.com')) label = storage.value.providerAmazonS3
      else if (hostname.includes('backblazeb2.com')) label = storage.value.providerBackblaze
      else if (hostname) label = storage.value.providerS3
    } catch {
      label = provider.label
    }
  }
  return bucket ? `${label} · ${bucket}` : label
})
/** The storage bucket as the sidebar lists it, or a prompt to set it up. */
const sidebarStorage = computed(() => {
  if (!storageConfigured.value)
    return { label: storage.value.workspace, detail: settings.value.notConfigured }
  const bucket = readStoragePreferences(activeStorageProviderID.value).bucket?.trim()
  return { label: bucket || storage.value.workspace, detail: storageDescription.value }
})
/** Where New design creates, named on the button; a local file when this is null. */
const newDesignTarget = computed<{ location: StorageLocation; label: string } | null>(() => {
  const workspace = places.workspace.value
  const serverId = places.serverId.value
  if (workspace && serverId && workspace.role !== 'viewer') {
    return {
      location: {
        providerId: CLOUD_STORAGE_PROVIDER_ID,
        profileId: serverId,
        containerId: workspace.id
      },
      label: workspace.name
    }
  }
  // Shared documents belong to other people's workspaces, so a new one goes to the person's own.
  const own = places.workspaces.value.find((entry) => entry.role !== 'viewer')
  if (places.location.value.kind === 'shared' && own && serverId) {
    return {
      location: { providerId: CLOUD_STORAGE_PROVIDER_ID, profileId: serverId, containerId: own.id },
      label: own.name
    }
  }
  if (places.location.value.kind === 'storage' && storageConfigured.value) {
    return {
      location: { providerId: activeStorageProviderID.value },
      label: sidebarStorage.value.label
    }
  }
  return null
})
const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase(locale.value))
const filteredRecentFiles = computed(() =>
  matchingRecentFiles(documents.value, normalizedQuery.value, locale.value)
)
const filteredStorageDocuments = computed(() => {
  if (!normalizedQuery.value) return storageDocuments.value
  return storageDocuments.value.filter((document) =>
    document.name.toLocaleLowerCase(locale.value).includes(normalizedQuery.value)
  )
})
const noSearchMatches = computed(
  () =>
    Boolean(normalizedQuery.value) &&
    places.location.value.kind !== 'libraries' &&
    places.location.value.kind !== 'drafts' &&
    filteredRecentFiles.value.length === 0 &&
    filteredStorageDocuments.value.length === 0
)

/**
 * Opens documents one after another, in the order picked, so their tabs keep that order. One that
 * cannot open does not stop the rest; Home names every failure once all have been tried.
 */
async function openEach<Document>(
  documents: readonly Document[],
  open: (document: Document) => Promise<void>
): Promise<void> {
  openError.value = null
  const failures: string[] = []
  for (const document of documents) {
    try {
      await open(document)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }
  openError.value = failures.length ? failures.join('\n') : null
}

function openRecentDocuments(documents: readonly RecentDocument[]): Promise<void> {
  // Before the storage list first loads, an empty list would hide the revision to check.
  const listed = storageWorkspace.lastRefreshedAt.value ? storageDocuments.value : undefined
  return openEach(documents, (document) => openRecentDocument(document, listed))
}

function openStorageDocuments(documents: readonly StorageDocument[]): Promise<void> {
  return openEach(documents, async (document) => {
    await openStorageDocumentInNewTab(document)
  })
}

/** Saves a copy of a document from Home, saying where it went or why it could not. */
async function saveCopy(
  source: DocumentCopySource,
  save: () => Promise<DocumentCopyResult> = () => saveDocumentCopy(source)
): Promise<void> {
  if (!canSaveDocumentCopy(source)) return
  try {
    const result = await save()
    if (result.status === 'saved') toast.info(files.value.savedDocumentAs({ name: result.name }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    toast.error(files.value.saveDocumentAsFailed({ name: source.name, error: message }))
  }
}

/** Whether new designs are kept as drafts here, which Drafts says when it has none. */
const draftsOn = computed(() => recoveryEnabled.value && draftsAvailable())

function openDrafts(drafts: readonly DraftMeta[]): Promise<void> {
  return openEach(drafts, async (draft) => {
    await openDraftInTab(draft.id)
  })
}

function saveDraftCopy(draft: DraftMeta) {
  return saveCopy({ kind: 'draft', draftId: draft.id, name: draft.name }, () =>
    saveDraftAs(draft.id, draft.name)
  )
}

function saveStoredCopy(document: StorageDocument) {
  return saveCopy({
    kind: 'storage',
    documentId: document.id,
    name: document.name,
    location: storageLocation.value
  })
}

/** Opens a new design with the design system's library turned on. */
async function startWithDesignSystem(library: LibrarySummary): Promise<void> {
  const tab = newDocument('design')
  try {
    await startDesignWith(tab.store, library)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    toast.error(notificationMessages.get().operationFailed({ error: message }))
  }
}
</script>

<template>
  <HomeLayout data-test-id="recent-files-home">
    <template #sidebar>
      <HomeSidebar
        :cloud="CLOUD_INCLUDED"
        :active="places.active.value"
        :account="places.account.value"
        :workspaces="places.workspaces.value"
        :storage="sidebarStorage"
        @select="places.select"
        @connect="places.connect"
        @open-account="places.openAccount"
        @storage-settings="places.storageSettings"
        @switch-server="places.connect"
        @new-workspace="places.newWorkspace"
        @sign-out="places.signOut"
      />
    </template>
    <template #locations>
      <HomeLocationMenu
        :cloud="CLOUD_INCLUDED"
        :active="places.active.value"
        :account="places.account.value"
        :workspaces="places.workspaces.value"
        :storage="sidebarStorage"
        @select="places.select"
        @connect="places.connect"
        @new-workspace="places.newWorkspace"
      />
    </template>
    <HomePromptComposer
      v-model="prompt"
      :busy="startingFromPrompt"
      :status="promptStatus"
      @submit="startFromPrompt"
    />
    <HomeSearchActions
      v-model="query"
      :destination="newDesignTarget?.label ?? null"
      @new-document="newDocument"
    />

    <p v-if="openError" class="mb-4 text-xs whitespace-pre-line text-error" role="alert">
      {{ openError }}
    </p>
    <!-- Nothing until Cloud says which workspace Home opens on. -->
    <template v-if="places.settling.value" />
    <CloudWorkspaceSection
      v-else-if="places.workspace.value && places.serverId.value"
      :server-id="places.serverId.value"
      :workspace="places.workspace.value"
      :query="normalizedQuery"
    />
    <CloudSharedSection
      v-else-if="places.location.value.kind === 'shared' && places.serverId.value"
      :server-id="places.serverId.value"
      :query="normalizedQuery"
    />
    <template v-else>
      <p v-if="noSearchMatches" :class="styles.empty()">
        {{ files.noMatchingFiles({ query: query.trim() }) }}
      </p>

      <RecentFilesSection
        v-if="!noSearchMatches && places.location.value.kind === 'recent'"
        v-model:view="view"
        :workspace="workspace"
        :documents="filteredRecentFiles"
        :query="normalizedQuery"
        @open="openRecentDocuments([$event])"
        @open-many="openRecentDocuments"
        @save-as="saveCopy(recentCopySource($event))"
      />

      <StorageWorkspaceSection
        v-if="places.location.value.kind === 'storage'"
        v-model:view="view"
        :workspace="storageWorkspace"
        :documents="filteredStorageDocuments"
        :configured="storageConfigured"
        :description="storageDescription"
        :location="storageLocation"
        :query="normalizedQuery"
        @open="openStorageDocuments([$event])"
        @open-many="openStorageDocuments"
        @save-as="saveStoredCopy"
      />

      <DraftsSection
        v-if="places.location.value.kind === 'drafts'"
        v-model:view="view"
        :source="draftsWorkspaceSource"
        :available="draftsOn"
        :query="normalizedQuery"
        @open="openDrafts([$event])"
        @open-many="openDrafts"
        @save-as="saveDraftCopy"
      />

      <DesignSystemsSection
        v-if="places.location.value.kind === 'libraries'"
        v-model:view="view"
        :query="query.trim()"
        @start="startWithDesignSystem"
      />
    </template>
  </HomeLayout>
</template>
