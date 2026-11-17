import { filename } from 'pathe/utils'
import { shallowRef, computed, triggerRef } from 'vue'

import { createDocumentGraph } from '@pairdraw/core'
import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'
import type { DocumentKind, SceneGraph } from '@pairdraw/scene-graph'

import { setPairdrawStore } from '@/app/browser/bridge'
import { describeDiagnosticError, recordStorageFailure } from '@/app/diagnostics'
import { viewDiagnosticsAction } from '@/app/diagnostics/view'
import { confirmAllDocuments } from '@/app/document/close/all'
import { confirmDocumentClose } from '@/app/document/close/controller'
import { requestDocumentClose } from '@/app/document/close/prompt'
import { documentAssetReader } from '@/app/document/io/assets'
import { applyImportedDocument } from '@/app/document/io/imported-document'
import { documentImportOpener, reportReadWarnings } from '@/app/document/io/imports'
import { isFigArchiveName } from '@/app/document/io/names'
import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { getRecoveryStore, type RecoverySnapshotMeta } from '@/app/document/recovery'
import { listedAtStartup } from '@/app/document/recovery/backups'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { appIcons } from '@/app/editor/icons/provider'
import type { EditorPreparationHandle as DocumentLoadSession } from '@/app/editor/preparation/types'
import { createEditorStore } from '@/app/editor/session'
import type { EditorStore } from '@/app/editor/session'
import { notificationMessages } from '@/app/i18n/notifications'
import {
  activeStorageProviderID,
  sameStorageDocument,
  storageLocationOf,
  type StorageDocument,
  type StorageDocumentBinding,
  type StorageLocation
} from '@/app/integrations/storage'
import { rememberRecentStorageDocument } from '@/app/recent-files'
import { createDeferred } from '@/app/runtime/deferred'
import { resolvedAppTheme } from '@/app/shell/theme'
import { toast } from '@/app/shell/ui'
import { createFileOpenCoordinator } from '@/app/tabs/open/coordinator'
import {
  refreshOpenedFigCover,
  stopWatchingFigCover,
  watchOpenedFigCover
} from '@/app/tabs/open/cover'
import { announceFileOpened } from '@/app/tabs/open/events'
import { figFile, readFigForTab } from '@/app/tabs/open/fig'
import { findTabByFileIdentity, hasFileIdentity } from '@/app/tabs/open/identity'
import { readStorageDocument } from '@/app/tabs/open/storage'

/**
 * Home, pinned first; a New file tab, which offers what to create and the recent files, as
 * Figma's ⌘T and + do, and becomes the document picked there; or a document.
 */
export type TabKind = 'home' | 'new-file' | 'document'

export interface Tab {
  id: string
  store: EditorStore
  kind: TabKind
}

const io = new IORegistry(BUILTIN_IO_FORMATS)
const fileOpenCoordinator = createFileOpenCoordinator()

let nextTabId = 1

function generateTabId(): string {
  return `tab-${nextTabId++}`
}

const tabsRef = shallowRef<Tab[]>([])
const activeTabId = shallowRef('')

export const activeTab = computed(() => tabsRef.value.find((t) => t.id === activeTabId.value))

/** Whether the tab in front holds a document: Home and a New file tab have none to save. */
export function showsDocument(): boolean {
  return activeTab.value?.kind === 'document'
}

export const allTabs = computed(() =>
  tabsRef.value.map((t) => ({
    id: t.id,
    name: t.store.state.documentName,
    isHome: t.kind === 'home',
    isNewFile: t.kind === 'new-file',
    isDirty: t.kind === 'document' && t.store.hasUnsavedChanges(),
    isPreparing: t.store.state.preparation !== null,
    preparationProgress: t.store.state.preparation?.progress ?? null,
    isActive: t.id === activeTabId.value
  }))
)

export function getActiveStore(): EditorStore {
  const tab = tabsRef.value.find((t) => t.id === activeTabId.value)
  if (!tab) throw new Error('No active tab')
  return tab.store
}

export function getActiveTabId(): string {
  return activeTabId.value
}

export function getTabById(tabId: string): Tab | undefined {
  return tabsRef.value.find((tab) => tab.id === tabId)
}

export function getTabForStore(store: EditorStore): Tab | undefined {
  return tabsRef.value.find((tab) => tab.store === store)
}

export function getTabsSnapshot(): Tab[] {
  return [...tabsRef.value]
}

export function createTab(store?: EditorStore, initialGraph?: SceneGraph): Tab {
  const s = store ?? createEditorStore(initialGraph)
  const tab: Tab = { id: generateTabId(), store: s, kind: 'document' }
  tabsRef.value = [...tabsRef.value, tab]
  activateTab(tab)
  return tab
}

/**
 * Opens an empty document of this kind: a design or a board. Picked in a New file tab, it takes
 * that tab's place; otherwise it gets a tab of its own.
 */
export function createDocumentTab(kind: DocumentKind): Tab {
  const picker = activeTab.value?.kind === 'new-file' ? activeTab.value : undefined
  const tab = createTab(undefined, createDocumentGraph(kind, resolvedAppTheme.value))
  if (picker) {
    const rest = tabsRef.value.filter((entry) => entry !== tab)
    tabsRef.value = rest.map((entry) => (entry === picker ? tab : entry))
    disposeTabStore(picker.store)
  }
  return tab
}

/** Opens a New file tab, as Figma's + and ⌘T do. */
export function openNewFileTab(): Tab {
  const tab: Tab = { id: generateTabId(), store: createEditorStore(), kind: 'new-file' }
  tabsRef.value = [...tabsRef.value, tab]
  activateTab(tab)
  return tab
}

/**
 * Shows Home, the one tab pinned first that never closes and never turns into a design, as in
 * Figma's desktop app; it is made the first time it is asked for.
 */
export function createHomeTab(): Tab {
  const existing = tabsRef.value.find((tab) => tab.kind === 'home')
  if (existing) {
    activateTab(existing)
    return existing
  }
  const tab: Tab = { id: generateTabId(), store: createEditorStore(), kind: 'home' }
  tabsRef.value = [tab, ...tabsRef.value]
  activateTab(tab)
  return tab
}

/**
 * Shows the store a Home or New file tab is holding as a document. The tab keeps its id, so an
 * agent still editing that document keeps its target. Home stays pinned on a fresh store: the
 * pinned tab never becomes the design.
 */
export function showHeldDocument(tab: Tab): Tab {
  if (tab.kind === 'document') return tab
  const wasHome = tab.kind === 'home'
  const shown: Tab = { id: tab.id, store: tab.store, kind: 'document' }
  tabsRef.value = tabsRef.value.map((entry) => (entry.id === tab.id ? shown : entry))
  if (wasHome) {
    tabsRef.value = [
      { id: generateTabId(), store: createEditorStore(), kind: 'home' },
      ...tabsRef.value
    ]
  }
  return shown
}

export function showNewTab(): void {
  createHomeTab()
}

/** `tabs` with Home first: as they are when it is, with their Home moved there, or `home()` added. */
export function withHomePinned(tabs: readonly Tab[], home: () => Tab): readonly Tab[] {
  if (tabs[0]?.kind === 'home') return tabs
  const existing = tabs.find((tab) => tab.kind === 'home')
  return existing ? [existing, ...tabs.filter((tab) => tab !== existing)] : [home(), ...tabs]
}

/** Pins Home first when it is missing, leaving the tab in front where it is. */
export function ensureHomeTab(): void {
  const pinned = withHomePinned(tabsRef.value, () => ({
    id: generateTabId(),
    store: createEditorStore(),
    kind: 'home'
  }))
  if (pinned !== tabsRef.value) tabsRef.value = [...pinned]
}

function activateTab(tab: Tab) {
  const previous = tabsRef.value.find((candidate) => candidate.id === activeTabId.value)
  previous?.store.setSnapGuides([])
  previous?.store.setLayoutInsertIndicator(null)
  previous?.store.setDropTarget(null)
  activeTabId.value = tab.id
  setActiveEditorStore(tab.store)
  triggerRef(tabsRef)
  setPairdrawStore(tab.store)
}

/** Activates the tab. False when no tab carries that id, so callers can tell a no-op apart. */
export function switchTab(tabId: string): boolean {
  const tab = tabsRef.value.find((t) => t.id === tabId)
  if (!tab) return false
  activateTab(tab)
  return true
}

/**
 * Activates the tab `step` places from the one in front, wrapping around the ends, as Figma's
 * ⌃Tab and ⌃⇧Tab do; Home counts, so the tab after the last is Home.
 */
export function switchAdjacentTab(step: 1 | -1): void {
  const tabs = tabsRef.value
  if (tabs.length < 2) return
  const index = tabs.findIndex((tab) => tab.id === activeTabId.value)
  activateTab(tabs[(index + step + tabs.length) % tabs.length])
}

function disposeTabStore(store: EditorStore): void {
  stopWatchingFigCover(store)
  store.preparationController.dispose()
  store.dispose()
}

/** What closing a tab does beyond removing it. */
export interface CloseOptions {
  /**
   * Leaves the document's draft and recovery copy behind, as automation must: nobody answered
   * for them. A deletion the person asked for leaves this off, so the copies go with the tab.
   */
  keepCopies?: boolean
}

/**
 * Close a tab, asking whether to save unsaved changes. Pass `unsaved` to decide without
 * asking, as automation must: nobody may be there to answer. `keepCopies` keeps what the
 * document kept of itself; a close the person asked for, even to delete the document, drops it.
 */
export async function closeTab(
  tabId: string,
  unsaved?: 'save' | 'discard',
  { keepCopies = false }: CloseOptions = {}
): Promise<void> {
  const idx = tabsRef.value.findIndex((t) => t.id === tabId)
  if (idx === -1) return

  const closingTab = tabsRef.value[idx]
  if (closingTab.kind === 'home') return
  // A New file tab holds no document to save or recover.
  if (closingTab.kind === 'new-file') {
    removeTab(closingTab)
    return
  }
  // A draft keeps the latest changes first, so a new document closes without asking. Automation
  // that discards takes the document as it is now first: the tab goes, what it kept does not.
  if (unsaved === 'discard') {
    if (keepCopies) await closingTab.store.persistRecoveryNow()
  } else await persistDraftBeforeClose(closingTab.store)
  const choice = unsaved
    ? await confirmDocumentClose(closingTab.store, async () => unsaved)
    : await requestDocumentClose(closingTab.store, closingTab.store.state.documentName)
  if (choice === 'cancel') return
  // Only a close that keeps copies leaves them: automation closes the tab while Home keeps
  // offering the draft or recovery copy, and everyone else decides for the document's own copies.
  if (choice === 'discard') {
    if (!keepCopies) {
      await closingTab.store.discardRecovery()
      await closingTab.store.discardDraft()
    }
  } else await closingTab.store.persistRecoveryNow()
  if (!tabsRef.value.includes(closingTab)) return
  if (choice !== 'discard' && closingTab.store.hasUnsavedChanges()) return
  removeTab(closingTab)
}

/** Writes a document's draft before closing; one that cannot be written leaves it unsaved. */
async function persistDraftBeforeClose(store: EditorStore): Promise<void> {
  await store.persistDraftNow().catch((error: unknown) => {
    console.warn('[Drafts] Saving the draft before closing failed:', error)
  })
}

/** Takes a tab out of the window and disposes its store, showing a neighbour or a new Home. */
function removeTab(closingTab: Tab): void {
  const idx = tabsRef.value.indexOf(closingTab)
  if (idx === -1) return
  const wasActive = activeTabId.value === closingTab.id
  disposeTabStore(closingTab.store)
  tabsRef.value = tabsRef.value.filter((t) => t !== closingTab)

  if (tabsRef.value.length === 0) {
    createHomeTab()
    return
  }

  if (wasActive) {
    const newIdx = Math.min(idx, tabsRef.value.length - 1)
    activateTab(tabsRef.value[newIdx])
  }
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function isDOMImportFile(file: File): boolean {
  return /\.(html?|xhtml)$/i.test(file.name)
}

/**
 * A tab a document opens in: a new one, or an untouched empty design in front; never Home. `from`
 * is the tab in front when the open began, which comes back to the front if the open fails.
 */
type OpeningTab = {
  store: EditorStore
  created: boolean
  from: Tab | undefined
  /** The reused tab's name before the open renamed it. */
  documentName: string
}

function reusableTabStore(): OpeningTab {
  const current = activeTab.value
  // The store knows every way it may hold a document: a path, a handle, a download name, storage,
  // a draft, or a copy this device kept, and whether anyone edited or renamed it.
  const isUntouched = current?.kind === 'document' && current.store.isBlankDocument()
  if (current && isUntouched) {
    return {
      store: current.store,
      created: false,
      from: current,
      documentName: current.store.state.documentName
    }
  }
  const { store } = createTab()
  return { store, created: true, from: current, documentName: store.state.documentName }
}

/**
 * After a document failed to open, the tab opened for it closes and the tab in front before it,
 * such as Home, comes back; an empty design it reused stays. The tab held nothing to keep: a
 * document with a copy this device kept is never reused, so no copy is discarded here.
 */
async function releaseOpeningTab(opening: OpeningTab): Promise<void> {
  if (!opening.created) {
    // The reused tab stays, so it gets back the name the failed open gave it.
    opening.store.state.documentName = opening.documentName
    return
  }
  const tab = getTabForStore(opening.store)
  if (!tab) return
  const wasActive = activeTabId.value === tab.id
  removeTab(tab)
  if (wasActive && opening.from && tabsRef.value.includes(opening.from)) activateTab(opening.from)
}

async function showImportedGraph(
  store: EditorStore,
  graph: SceneGraph,
  prepare?: () => void | Promise<void>,
  load?: DocumentLoadSession
): Promise<void> {
  load?.update({ phase: 'materializing', detail: store.state.documentName })
  await applyImportedDocument(store, graph, load)
  load?.signal.throwIfAborted()
  await prepare?.()
  load?.signal.throwIfAborted()
  const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
  load?.update({ phase: 'populating-page', detail: store.graph.getNode(pageId)?.name ?? null })
  await store.switchPage(pageId, { preparation: load })
  load?.signal.throwIfAborted()
  load?.update({ phase: 'preparing-render', detail: store.state.documentName })
  await store.fitCurrentPageToViewport()
}

function findStorageTab(target: StorageDocumentBinding): Tab | undefined {
  return tabsRef.value.find((tab) => {
    const binding = tab.store.getStorageBinding()
    return binding !== null && sameStorageDocument(binding, target)
  })
}

function failPreparation(
  load: DocumentLoadSession,
  code: 'read-failed' | 'decode-failed',
  error: unknown
): void {
  if (load.signal.aborted) return
  load.fail({
    code,
    message: error instanceof Error ? error.message : String(error),
    retryable: true
  })
}

async function showStorageDocument(
  store: EditorStore,
  binding: StorageDocumentBinding,
  document: StorageDocument,
  load: DocumentLoadSession,
  given?: Uint8Array
): Promise<void> {
  const bytes = given ?? (await readStorageDocument(binding, document, load))
  const file = figFile(bytes, document.name)
  load.update({ phase: 'decoding', detail: document.name })
  const imported = await readFigForTab(file, load.signal)
  await showImportedGraph(
    store,
    imported,
    () => store.setStorageDocumentSource(binding, document.name),
    load
  )
}

/**
 * Reads a `.fig` file's bytes as a tab opens them, laid out and ready to show, for an editor of
 * its own such as an earlier version's preview.
 */
export function readFigBytes(
  bytes: Uint8Array,
  name: string,
  signal?: AbortSignal
): Promise<SceneGraph> {
  return readFigForTab(figFile(bytes, name), signal)
}

/**
 * Shows what this device now holds for a tab's stored document, as after a conflict, or `bytes`
 * just taken from its storage.
 */
export async function reloadStorageDocumentInTab(
  store: EditorStore,
  bytes?: Uint8Array
): Promise<void> {
  const binding = store.getStorageBinding()
  if (!binding) return
  const name = store.state.documentName
  const load = store.preparationController.begin({ kind: 'storage-open', subject: name })
  try {
    await showStorageDocument(
      store,
      binding,
      { id: binding.documentId, name, updatedAt: new Date().toISOString() },
      load,
      bytes
    )
    load.complete()
  } catch (error) {
    failPreparation(load, 'read-failed', error)
    throw error
  }
}

export async function openStorageDocumentInNewTab(
  document: StorageDocument,
  location: StorageLocation = { providerId: activeStorageProviderID.value }
): Promise<EditorStore> {
  const binding: StorageDocumentBinding = {
    ...storageLocationOf(location),
    documentId: document.id
  }
  const existing = findStorageTab(binding)
  if (existing) {
    switchTab(existing.id)
    rememberRecentStorageDocument(binding, document.name)
    return existing.store
  }

  const opening = reusableTabStore()
  const { store } = opening
  store.state.documentName = document.name
  const load = store.preparationController.begin({
    kind: 'storage-open',
    subject: document.name
  })
  let succeeded = false
  try {
    await showStorageDocument(store, binding, document, load)
    rememberRecentStorageDocument(binding, document.name)
    succeeded = true
  } catch (error) {
    if (!load.signal.aborted) {
      const diagnostic = describeDiagnosticError(error)
      load.fail({
        code: 'read-failed',
        message: error instanceof Error ? error.message : String(error),
        retryable: diagnostic.retryable ?? true
      })
      recordStorageFailure({ operation: 'download', ...diagnostic })
      toast.error(
        notificationMessages.get().openFileFailed({
          name: document.name,
          error: error instanceof Error ? error.message : String(error)
        }),
        viewDiagnosticsAction()
      )
    }
    await releaseOpeningTab(opening)
    throw error
  } finally {
    if (succeeded) load.complete()
  }
  return store
}

export async function openFileInNewTab(
  file: File,
  handle?: FileSystemFileHandle,
  path?: string
): Promise<EditorStore> {
  const identity: DocumentSourceIdentity = {
    handle: handle ?? null,
    path: path ?? null
  }
  const decision = await fileOpenCoordinator.decide(async () => {
    const pending = await fileOpenCoordinator.findPending(identity)
    if (pending) {
      const tab = getTabForStore(pending.store)
      if (tab) switchTab(tab.id)
      return { kind: 'pending' as const, completion: pending.completion, store: pending.store }
    }

    const existing = await findTabByFileIdentity(tabsRef.value, identity)
    if (existing) {
      switchTab(existing.id)
      if (path && isFigArchiveName(path)) {
        watchOpenedFigCover(path, existing.store)
        refreshOpenedFigCover(path, existing.store)
      }
      return { kind: 'existing' as const, store: existing.store }
    }

    const opening = reusableTabStore()
    const { store } = opening
    store.state.documentName = filename(file.name) ?? file.name
    const load = store.preparationController.begin({
      kind: isDOMImportFile(file) ? 'dom-import' : 'document-open',
      subject: file.name
    })

    const completion = createDeferred<undefined>()
    void completion.promise.catch(() => undefined)
    const pendingOpen = { completion: completion.promise, identity, store }
    fileOpenCoordinator.add(pendingOpen)
    return { kind: 'owner' as const, completion, pendingOpen, store, opening, load }
  })

  if (decision.kind === 'existing') return decision.store
  if (decision.kind === 'pending') {
    await decision.completion
    return decision.store
  }

  const { completion, pendingOpen, store, opening, load } = decision
  let succeeded = false
  try {
    if (isDOMImportFile(file)) {
      await store.openDOMFile(file, { handle, path, preparation: load })
      completion.resolve(undefined)
      succeeded = true
      return store
    }

    await yieldToUI()
    load.update({ phase: 'reading', detail: file.name })
    const isFig = isFigArchiveName(file.name)
    let imported: SceneGraph
    let sourceFormat: string
    if (isFig) {
      load.update({ phase: 'decoding', detail: file.name })
      imported = await readFigForTab(file, load.signal)
      sourceFormat = 'fig'
    } else {
      const result = await io.readDocument(
        {
          name: path ?? file.name,
          mimeType: file.type || undefined,
          data: new Uint8Array(await file.arrayBuffer()),
          readAsset: documentAssetReader(path),
          openImport: documentImportOpener(path)
        },
        { icons: appIcons }
      )
      imported = result.graph
      sourceFormat = result.sourceFormat
      reportReadWarnings(file.name, result.warnings)
    }

    await showImportedGraph(
      store,
      imported,
      () => {
        store.setDocumentSource(file.name, sourceFormat, handle, path)
        if (isFig && path) watchOpenedFigCover(path, store)
      },
      load
    )
    if (isFig && path) {
      refreshOpenedFigCover(path, store)
    }
    if (isFig && hasFileIdentity(identity)) {
      // A browser file handle reports when the file last changed; desktop bytes carry no date.
      announceFileOpened({ store, identity, modifiedAt: handle ? file.lastModified : undefined })
    }
    completion.resolve(undefined)
    succeeded = true
    return store
  } catch (error) {
    failPreparation(load, 'decode-failed', error)
    completion.reject(error)
    await releaseOpeningTab(opening)
    throw error
  } finally {
    if (succeeded) load.complete()
    fileOpenCoordinator.remove(pendingOpen)
  }
}

/**
 * Copies of documents with no file. A file's backup is offered when that file opens instead, and
 * here only once it went unclaimed for long, as a moved or renamed file never offers it.
 */
export async function listRecoverySnapshots(): Promise<RecoverySnapshotMeta[]> {
  const now = Date.now()
  return (await getRecoveryStore().list()).filter((snapshot) => listedAtStartup(snapshot, now))
}

export async function discardRecoverySnapshot(id: string): Promise<void> {
  await getRecoveryStore().remove(id)
}

export async function restoreRecoverySnapshot(id: string): Promise<EditorStore> {
  const snapshot = await getRecoveryStore().read(id)
  if (!snapshot) throw new Error('Recovery snapshot is no longer available')
  return openKeptDocument({
    name: snapshot.documentName,
    bytes: snapshot.figBytes,
    kind: 'recovery-restore',
    adopt: (store) => store.adoptRecoverySnapshot(id)
  })
}

/** `.fig` bytes this device keeps for a document, such as a recovery copy or a draft. */
export type KeptDocument = {
  name: string
  bytes: Uint8Array
  kind: 'recovery-restore' | 'document-open'
  /** Ties the opened document to where its bytes are kept. */
  adopt: (store: EditorStore) => void | Promise<void>
}

/**
 * Opens a document this device keeps in a tab, or in the untouched empty design in front. When it
 * fails, the kept bytes stay where they are.
 */
export async function openKeptDocument(kept: KeptDocument): Promise<EditorStore> {
  const opening = reusableTabStore()
  const { store } = opening
  const load = store.preparationController.begin({ kind: kept.kind, subject: kept.name })
  let succeeded = false
  try {
    load.update({ phase: 'decoding', detail: kept.name })
    const imported = await readFigForTab(figFile(kept.bytes, kept.name), load.signal)
    await showImportedGraph(
      store,
      imported,
      async () => {
        store.state.documentName = kept.name
        await kept.adopt(store)
      },
      load
    )
    succeeded = true
    return store
  } catch (error) {
    failPreparation(load, 'decode-failed', error)
    await releaseOpeningTab(opening)
    throw error
  } finally {
    if (succeeded) load.complete()
  }
}

export async function prepareForClose(): Promise<boolean> {
  const documents = () =>
    tabsRef.value.filter((tab) => tab.kind === 'document').map((tab) => tab.store)
  await Promise.all(documents().map(persistDraftBeforeClose))
  return confirmAllDocuments(documents)
}

export async function prepareForReload(): Promise<void> {
  await Promise.all(tabsRef.value.map((tab) => tab.store.persistRecoveryNow()))
}

export function tabCount(): number {
  return tabsRef.value.length
}

export function useTabsStore() {
  return {
    tabs: allTabs,
    activeTabId,
    createHomeTab,
    createTab,
    switchTab,
    closeTab,
    getActiveTabId,
    getTabById,
    getTabForStore,
    getTabsSnapshot,
    openFileInNewTab,
    openStorageDocumentInNewTab,
    listRecoverySnapshots,
    restoreRecoverySnapshot,
    discardRecoverySnapshot,
    prepareForReload,
    getActiveStore,
    tabCount
  }
}
