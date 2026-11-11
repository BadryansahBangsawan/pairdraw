import { debounce } from 'es-toolkit'
import { watch } from 'vue'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { exportFigFile } from '@open-pencil/core/io/formats/fig'

import type { EditorStore } from '@/app/editor/active-store'
import {
  activeTab,
  closeTab,
  createTab,
  getTabsSnapshot,
  openFileInNewTab,
  switchTab,
  type Tab
} from '@/app/tabs'

import type { EmbedEditorHost } from './host'
import { EmbedRequestError, type EmbedEventMessage, type EmbedImageFormat } from './protocol'

/** How long edits settle before the host hears `documentchange`. */
const DOCUMENT_CHANGE_DEBOUNCE_MS = 250

const IMAGE_MIME_TYPES: Record<EmbedImageFormat, string> = {
  PNG: 'image/png',
  JPG: 'image/jpeg',
  WEBP: 'image/webp'
}

function shownStoreOrNull(): EditorStore | null {
  const tab = activeTab.value
  return tab?.kind === 'document' ? tab.store : null
}

function shownStore(): EditorStore {
  const tab = activeTab.value
  if (tab?.kind !== 'document') throw new EmbedRequestError('no-document', 'No document is shown')
  return tab.store
}

/**
 * Holds a document the way an embed shows it: read-only unless the session is editable, and never
 * kept as a draft or flagged unsaved on this device, since the host page owns where it is saved.
 */
function applyEmbedPolicy(store: EditorStore, editable: boolean): void {
  store.suspendDraft(true)
  store.setReadOnly(!editable)
}

/**
 * Puts a document back in front of a tab that is not one, such as Home after the last document
 * closed: the shown document, or else a new empty one. A New file tab goes; Home never closes.
 */
function showDocumentInsteadOf(tab: Tab): void {
  const shown = getTabsSnapshot().find((candidate) => candidate.kind === 'document')
  if (shown) switchTab(shown.id)
  else createTab()
  if (tab.kind === 'new-file') void closeTab(tab.id)
}

/** The formats a `load` may name by its file name. */
const readableFormats = new IORegistry(BUILTIN_IO_FORMATS)

/**
 * The file a `load` names. The protocol's `name` is often the document's own name, as
 * `getDocument` returns it, which carries no extension: such a name is read as the `.fig` archive
 * the host holds, while a name that states a format the editor opens keeps it.
 */
function loadedFileName(name: string): string {
  return readableFormats.findReader(name) ? name : `${name}.fig`
}

/**
 * The editor's tabs and active document behind the embed protocol. Every document the window
 * shows, including one a shortcut opens, takes the session's editability until `dispose`, and the
 * window always shows a document.
 */
export function createEmbedEditorHost(): EmbedEditorHost {
  let editable = false
  // Synchronous, so a tab that opens for a document is read-only before anyone can edit it, and
  // the open itself runs against the read-only document, as every step it takes is allowed there.
  const stopPolicy = watch(
    shownStoreOrNull,
    (store) => {
      if (store) applyEmbedPolicy(store, editable)
    },
    { flush: 'sync', immediate: true }
  )
  const stopDocumentGuard = watch(activeTab, (tab) => {
    if (tab && tab.kind !== 'document') showDocumentInsteadOf(tab)
  })
  // Loads run one at a time: one that closed the tabs of another still opening would leave none.
  let loads: Promise<unknown> = Promise.resolve()

  async function loadNow(name: string, data: Uint8Array) {
    const file = new File([new Uint8Array(data)], loadedFileName(name), {
      type: 'application/octet-stream'
    })
    const store = await openFileInNewTab(file)
    applyEmbedPolicy(store, editable)
    store.markDocumentSaved()
    // An embed shows one document: the one it showed before goes, without asking to save.
    for (const tab of getTabsSnapshot()) {
      if (tab.kind === 'document' && tab.store !== store) await closeTab(tab.id, 'discard')
    }
    return { name: store.state.documentName }
  }

  return {
    load(name, data) {
      const loading = loads.then(() => loadNow(name, data))
      loads = loading.catch(() => undefined)
      return loading
    },

    async getDocument() {
      const store = shownStore()
      const renderer = store.renderer
      const data = await exportFigFile(store.graph, {
        ck: renderer?.ck,
        renderer: renderer ?? undefined,
        pageId: store.state.currentPageId,
        documentName: store.state.documentName
      })
      return { name: store.state.documentName, data }
    },

    getPages() {
      const store = shownStore()
      return {
        pages: store.graph.getPages().map((page) => ({ id: page.id, name: page.name })),
        currentPageId: store.state.currentPageId
      }
    },

    async setPage(pageId) {
      const store = shownStore()
      if (!store.graph.getPages().some((page) => page.id === pageId)) {
        throw new EmbedRequestError('not-found', `No page has the ID ${pageId}`)
      }
      await store.switchPage(pageId)
    },

    getSelection() {
      return [...shownStore().state.selectedIds]
    },

    select(nodeIds) {
      const store = shownStore()
      const pageId = store.state.currentPageId
      const onPage = nodeIds.filter((id) => id !== pageId && store.graph.pageOf(id) === pageId)
      store.select(onPage)
      return [...store.state.selectedIds]
    },

    zoomToFit() {
      shownStore().zoomToFit()
    },

    async exportImage(nodeIds, format, scale) {
      const store = shownStore()
      const ids =
        nodeIds ??
        (store.state.selectedIds.size > 0
          ? [...store.state.selectedIds]
          : store.graph.getChildren(store.state.currentPageId).map((node) => node.id))
      if (ids.length === 0)
        throw new EmbedRequestError('not-found', 'There are no layers to export')
      if (!store.renderer) {
        throw new EmbedRequestError(
          'failed',
          'The canvas has not started, so it cannot draw images'
        )
      }
      const data = await store.renderExportImage(ids, scale, format)
      if (!data) throw new EmbedRequestError('failed', 'The renderer returned no image')
      return { data, mimeType: IMAGE_MIME_TYPES[format] }
    },

    setEditable(next) {
      editable = next
      const store = shownStoreOrNull()
      if (store) applyEmbedPolicy(store, editable)
    },

    subscribe(listener) {
      let unbind: (() => void) | null = null
      const stopWatch = watch(
        shownStoreOrNull,
        (store) => {
          unbind?.()
          unbind = store ? bindStoreEvents(store, listener) : null
        },
        { immediate: true }
      )
      return () => {
        stopWatch()
        unbind?.()
      }
    },

    dispose() {
      stopPolicy()
      stopDocumentGuard()
    }
  }
}

/** Forwards one document's events; a document's edits are the host's to save, so none stay unsaved. */
function bindStoreEvents(
  store: EditorStore,
  listener: (event: EmbedEventMessage) => void
): () => void {
  const documentChanged = debounce(() => {
    // Opening a document reports history while it loads and is then marked as the host's copy,
    // so by the time edits settle there may be nothing left to report.
    if (!store.hasUnsavedChanges()) return
    store.markDocumentSaved()
    listener({ event: 'documentchange', data: { name: store.state.documentName } })
  }, DOCUMENT_CHANGE_DEBOUNCE_MS)
  const stops = [
    store.onEditorEvent('selection:changed', (selectedIds) =>
      listener({ event: 'selectionchange', data: { nodeIds: [...selectedIds] } })
    ),
    store.onEditorEvent('page:changed', (pageId) =>
      listener({ event: 'pagechange', data: { pageId } })
    ),
    store.onEditorEvent('history:changed', () => {
      if (store.hasUnsavedChanges()) documentChanged()
    }),
    store.onEditorEvent('graph:replaced', () =>
      listener({ event: 'documentload', data: { name: store.state.documentName } })
    )
  ]
  return () => {
    documentChanged.cancel()
    for (const stop of stops) stop()
  }
}
