import { createEventHook } from '@vueuse/core'

import type { Editor, EditorState } from '@pairdraw/core'
import { exportFigFile } from '@pairdraw/core/io/formats/fig'

import { createAutosave } from '@/app/document/autosave'
import { createDocumentDraft, draftsAvailable } from '@/app/document/drafts'
import { createDocumentChanges } from '@/app/document/io/changes'
import {
  documentFileName,
  documentNameFromFigPath,
  downloadNameFromPath,
  figDownloadName
} from '@/app/document/io/names'
import { createSaveActions } from '@/app/document/io/save/actions'
import { createDocumentSourceState } from '@/app/document/io/source/state'
import type { DocumentSourceAccess } from '@/app/document/io/types'
import { createDocumentRecovery } from '@/app/document/recovery'
import { removeFileBackups } from '@/app/document/recovery/backups'
import { recoveryEnabled } from '@/app/document/recovery/preferences'
import { storageLocationOf } from '@/app/integrations/storage/location'
import type { StorageDocumentBinding, StorageLocation } from '@/app/integrations/storage/types'
import { createCanvasId } from '@/app/storage/id'
import { isTauri } from '@/app/tauri/env'

type DocumentSourceState = EditorState & {
  documentName: string
  autosaveEnabled: boolean
}

export { createDocumentSourceState }

type DocumentSourceOptions = DocumentSourceAccess & {
  editor: Editor
  state: DocumentSourceState
  stopWatchingFile: () => void
  startWatchingFile: () => Promise<void>
  /** Whether the file changed on disk and the person has not chosen what to keep yet. */
  isDiskChangePending?: () => boolean
  getRenderer: () => Editor['renderer']
}

export function createDocumentSourceActions({
  editor,
  state,
  stopWatchingFile,
  startWatchingFile,
  getFileHandle,
  setFileHandle,
  getFilePath,
  setFilePath,
  getDownloadName,
  setDownloadName,
  getStorageBinding,
  setStorageBinding,
  hasWritableSource,
  setSourceIdentity,
  getSavedVersion,
  setSavedVersion,
  setLastWriteTime,
  isDiskChangePending = () => false,
  getRenderer
}: DocumentSourceOptions) {
  const changes = createDocumentChanges(editor)

  async function saveAndTrack(save: () => Promise<boolean>) {
    const revision = changes.capture()
    const saved = await save()
    if (saved) changes.markSaved(revision)
    return saved
  }

  function buildFigFile() {
    const renderer = getRenderer()
    return exportFigFile(editor.graph, {
      ck: renderer?.ck,
      renderer: renderer ?? undefined,
      pageId: state.currentPageId,
      documentName: state.documentName
    })
  }

  function buildRecoveryFigFile() {
    return exportFigFile(editor.graph, {
      pageId: state.currentPageId,
      documentName: state.documentName
    })
  }

  /** The file a save writes in place, whose unsaved changes recovery backs up. */
  function writableFile() {
    if (getStorageBinding()) return null
    const handle = getFileHandle()
    if (handle) return { handle, path: null }
    const path = getFilePath()
    return path && isTauri() ? { handle: null, path } : null
  }

  const draft = createDocumentDraft({
    state,
    version: changes.capture,
    buildFigFile,
    isSourceless: () => !hasWritableSource() && !getFilePath() && !getDownloadName(),
    isEnabled: () => recoveryEnabled.value && !state.hostRestrictions.readOnly && draftsAvailable(),
    markSaved: (version) => changes.markSaved(version),
    // The draft holds what a recovery copy would, so the copy goes once it is written.
    onPersisted: () => recovery.discardRecovery()
  })

  const recovery = createDocumentRecovery({
    state,
    version: changes.capture,
    isEnabled: () => recoveryEnabled.value,
    buildFigFile: buildRecoveryFigFile,
    hasWritableSource,
    fileSource: writableFile,
    autosaveCovers: () => state.autosaveEnabled && !isDiskChangePending(),
    keptElsewhere: () => draft.keepsChanges(),
    hasChanges: changes.hasUnsavedChanges
  })

  /**
   * A save to a place of the document's own: recovery's copy and the draft are done, and so is
   * any backup of the file from an earlier session, which holds older changes than the file now.
   */
  async function afterSave(version: number) {
    await recovery.markProtectedVersion(version)
    await draft.release()
    const file = writableFile()
    if (!file) return
    await removeFileBackups(file, { except: recovery.getRecoveryId() }).catch((error: unknown) => {
      console.warn('[Recovery] Deleting the saved file’s older backups failed:', error)
    })
  }

  const { saveFigFile, saveFigFileAs, writeFile } = createSaveActions({
    state,
    version: changes.capture,
    buildFigFile,
    getFilePath,
    setFilePath,
    getFileHandle,
    setFileHandle,
    getDownloadName,
    setDownloadName,
    getStorageBinding,
    setStorageBinding,
    hasWritableSource,
    setSourceIdentity,
    setSavedVersion,
    setLastWriteTime,
    startWatchingFile: () => {
      void startWatchingFile()
    },
    // A download is not confirmed (the person can cancel the browser's prompt), so the draft and
    // recovery's copy stay until a save the app can confirm.
    onWriteSuccess: afterSave
  })

  const autosave = createAutosave({
    state,
    version: changes.capture,
    getSavedVersion,
    // Autosave would write over the changed file before the person chose to keep it or not.
    hasWritableSource: () => hasWritableSource() && !isDiskChangePending(),
    saveCurrentDocument: async (version) => {
      const revision = changes.capture()
      const data = await buildFigFile()
      if (await writeFile(data, version)) changes.markSaved(revision)
    }
  })

  function markDocumentSaved() {
    changes.markSaved()
    setSavedVersion(changes.capture())
  }

  // Only names the person gives; a save's provisional name and the room's own are no rename.
  const renamed = createEventHook<string>()

  function renameDocument(name: string) {
    const trimmed = name.trim()
    if (state.hostRestrictions.readOnly || !trimmed || trimmed === state.documentName) return
    state.documentName = trimmed
    // Storage and drafts keep the name with the document; a file's name is its path, which saving
    // leaves as is.
    if (getStorageBinding() || draft.keepsChanges()) changes.markChanged()
    void renamed.trigger(trimmed)
  }

  function setDocumentSource(
    fileName: string,
    sourceFormat: string,
    handle?: FileSystemFileHandle,
    path?: string
  ) {
    stopWatchingFile()
    setStorageBinding(null)
    const isFig = sourceFormat === 'fig'
    setFileHandle(isFig ? (handle ?? null) : null)
    setFilePath(isFig ? (path ?? null) : null)
    setDownloadName(figDownloadName(fileName, sourceFormat))
    setSourceIdentity({ handle: handle ?? null, path: path ?? null })
    markDocumentSaved()
    void recovery.markProtectedVersion(changes.capture())
    if (isFig && (handle || path)) {
      void startWatchingFile()
    }
  }

  function setStorageDocumentSource(binding: StorageDocumentBinding, documentName: string) {
    stopWatchingFile()
    setFileHandle(null)
    setFilePath(null)
    setDownloadName(documentFileName(documentName, state.documentKind))
    setSourceIdentity({ handle: null, path: null })
    setStorageBinding(binding)
    state.documentName = documentName
    state.autosaveEnabled = true
    markDocumentSaved()
    void recovery.markProtectedVersion(changes.capture())
  }

  function setPlannedFilePath(path: string) {
    stopWatchingFile()
    setStorageBinding(null)
    setFileHandle(null)
    setFilePath(path)
    const downloadName = downloadNameFromPath(path)
    setDownloadName(downloadName)
    state.documentName = documentNameFromFigPath(downloadName)
  }

  let retargeting = false

  /**
   * Save to a new target; when the write fails, the document keeps the source it had. A second
   * retarget while one is in flight is refused, so a failure never restores another save's target.
   */
  async function saveToNewTarget(planTarget: () => void): Promise<boolean> {
    if (retargeting) return false
    retargeting = true
    const previous = {
      filePath: getFilePath(),
      fileHandle: getFileHandle(),
      storageBinding: getStorageBinding(),
      downloadName: getDownloadName(),
      documentName: state.documentName
    }
    const restore = () => {
      setStorageBinding(previous.storageBinding)
      setFileHandle(previous.fileHandle)
      setFilePath(previous.filePath)
      setDownloadName(previous.downloadName)
      state.documentName = previous.documentName
      if (previous.filePath || previous.fileHandle) void startWatchingFile()
    }
    planTarget()
    try {
      const saved = await saveAndTrack(saveFigFile)
      if (!saved) restore()
      return saved
    } catch (error) {
      restore()
      throw error
    } finally {
      retargeting = false
    }
  }

  async function saveFigFileToPath(path: string): Promise<boolean> {
    // Only the desktop app writes paths; a browser would fall back to a download.
    if (!isTauri()) return false
    const saved = await saveToNewTarget(() => setPlannedFilePath(path))
    if (saved) void startWatchingFile()
    return saved
  }

  /**
   * Hand the document to `write`, such as an MCP server saving it to a path a browser cannot
   * reach, and count it saved as a download is. Where the document saves next does not change.
   */
  async function saveFigFileCopy(write: (data: Uint8Array) => Promise<void>): Promise<boolean> {
    const version = changes.capture()
    await write(await buildFigFile())
    await recovery.markProtectedVersion(version)
    return true
  }

  /** Upload the document to storage as a new stored document and keep editing it there. */
  async function saveFigFileToStorage(location: StorageLocation): Promise<boolean> {
    const saved = await saveToNewTarget(() => {
      stopWatchingFile()
      setFileHandle(null)
      setFilePath(null)
      setDownloadName(documentFileName(state.documentName, state.documentKind))
      setStorageBinding({ ...storageLocationOf(location), documentId: createCanvasId() })
    })
    if (saved) {
      setSourceIdentity({ handle: null, path: null })
      state.autosaveEnabled = true
    }
    return saved
  }

  /**
   * Whether this is still the empty design its tab started with, which another document may take
   * the place of: nothing was opened into it, saved, downloaded, or kept for it, and nobody
   * edited or renamed it.
   */
  function isBlankDocument(): boolean {
    return (
      state.documentName === 'Untitled' &&
      !editor.undo.canUndo &&
      !changes.hasUnsavedChanges() &&
      !hasWritableSource() &&
      getFilePath() === null &&
      getFileHandle() === null &&
      getDownloadName() === null &&
      getStorageBinding() === null &&
      draft.getDraftId() === null &&
      !recovery.hasAdoptedCopy()
    )
  }

  function startWatchingCurrentFile() {
    void startWatchingFile()
  }

  function disposeDocumentIO() {
    changes.dispose()
    stopWatchingFile()
    autosave.disposeAutosave()
    draft.dispose()
    recovery.disposeRecovery()
  }

  return {
    renameDocument,
    onDocumentRenamed: renamed.on,
    setDocumentSource,
    setStorageDocumentSource,
    setPlannedFilePath,
    saveFigFileToPath,
    saveFigFileCopy: (write: (data: Uint8Array) => Promise<void>) =>
      saveAndTrack(() => saveFigFileCopy(write)),
    saveFigFileToStorage,
    isBlankDocument,
    startWatchingCurrentFile,
    disposeDocumentIO,
    saveFigFile: () => saveAndTrack(saveFigFile),
    saveFigFileAs: () => saveAndTrack(saveFigFileAs),
    hasUnsavedChanges: changes.hasUnsavedChanges,
    markDocumentSaved,
    markDocumentChanged: changes.markChanged,
    adoptChanges: changes.adopt,
    getStorageBinding,
    getRecoveryId: () => recovery.getRecoveryId(),
    adoptRecoverySnapshot: (id: string) => {
      changes.markChanged()
      return recovery.adoptRecoverySnapshot(id)
    },
    persistRecoveryNow: async () => {
      await draft.persistNow()
      await recovery.persistNow()
    },
    discardRecovery: () => recovery.discardRecovery(),
    getDraftId: () => draft.getDraftId(),
    /** Ties the document to the draft it was opened from, saved as it is now. */
    adoptDraft: (id: string) => {
      draft.adopt(id)
      markDocumentSaved()
    },
    persistDraftNow: () => draft.persistNow(),
    discardDraft: () => draft.discard(),
    suspendDraft: (suspended: boolean) => draft.suspend(suspended)
  }
}
