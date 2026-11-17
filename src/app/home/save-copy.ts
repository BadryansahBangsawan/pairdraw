import { basename, extname } from 'pathe'

import { recoveryMessages } from '@pairdraw/vue/i18n'

import { readDraft } from '@/app/document/drafts'
import { downloadBlob } from '@/app/document/io/browser'
import { isFileWriteRefused, pickBrowserSaveFile } from '@/app/document/io/capability'
import { documentFileName, isFigArchiveName } from '@/app/document/io/names'
import {
  createStorageAdapter,
  sameStorageLocation,
  storageLocationOf,
  type StorageLocation
} from '@/app/integrations/storage'
import { rememberRecentFile, type RecentDocument } from '@/app/recent-files'
import { getLocalCanvasStore } from '@/app/storage/local-store'
import { IS_TAURI } from '@/constants'

/** A document Home can save a copy of: a file on disk, a document kept in storage, or a draft. */
export type DocumentCopySource =
  | { kind: 'local'; path: string; name: string }
  | { kind: 'storage'; documentId: string; name: string; location: StorageLocation }
  | { kind: 'draft'; draftId: string; name: string }

/** What Save As from Home did: saved a copy under `name`, or nothing when the person cancelled. */
export type DocumentCopyResult = { status: 'saved'; name: string } | { status: 'cancelled' }

/** The copy source of a recent document. */
export function recentCopySource(document: RecentDocument): DocumentCopySource {
  if (document.kind === 'local') {
    return { kind: 'local', path: document.path, name: document.name }
  }
  return {
    kind: 'storage',
    documentId: document.documentId,
    name: document.name,
    location: storageLocationOf(document)
  }
}

/**
 * Whether Home can save a copy of `source`: a stored document anywhere, a file on disk only in the
 * desktop app, which can read it.
 */
export function canSaveDocumentCopy(source: DocumentCopySource, desktop = IS_TAURI): boolean {
  return source.kind !== 'local' || desktop
}

/** The name a copy is offered under: a file keeps its own; a stored design gets `.fig`. */
export function documentCopyFileName(source: DocumentCopySource): string {
  if (source.kind === 'local') return basename(source.path) || source.name
  return isFigArchiveName(source.name) ? source.name : documentFileName(source.name, 'design')
}

/** Reads a stored document's bytes from its provider. */
export type ProviderDocumentReader = (
  documentId: string,
  location: StorageLocation
) => Promise<Uint8Array>

async function providerDocumentBytes(documentId: string, location: StorageLocation) {
  return (await createStorageAdapter(location).getDocument(documentId)).bytes
}

/**
 * A stored document's bytes: this device's copy while it holds changes the provider has not got,
 * otherwise the provider's, falling back to this device's copy when the provider cannot answer.
 * A copy this device keeps for another location is a different document and is never used.
 */
export async function storedDocumentBytes(
  documentId: string,
  location: StorageLocation,
  readFromProvider: ProviderDocumentReader = providerDocumentBytes
): Promise<Uint8Array> {
  const local = getLocalCanvasStore()
  const meta = await local.getMeta(documentId)
  const copy =
    meta?.hasFig && sameStorageLocation(storageLocationOf(meta), location)
      ? await local.readFig(documentId)
      : null
  if (copy && meta?.syncStatus !== 'synced') return copy
  try {
    return await readFromProvider(documentId, location)
  } catch (error) {
    if (copy) return copy
    throw error
  }
}

async function documentBytes(source: DocumentCopySource): Promise<Uint8Array> {
  if (source.kind === 'storage') return storedDocumentBytes(source.documentId, source.location)
  if (source.kind === 'draft') {
    const draft = await readDraft(source.draftId)
    if (!draft) throw new Error(recoveryMessages.get().draftUnavailable)
    return draft.figBytes
  }
  const { readFile } = await import('@tauri-apps/plugin-fs')
  return readFile(source.path)
}

async function saveCopyOnDesktop(
  source: DocumentCopySource,
  fileName: string,
  extension: string
): Promise<DocumentCopyResult> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const path = await save({
    defaultPath: fileName,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
  })
  if (!path) return { status: 'cancelled' }
  const bytes = await documentBytes(source)
  const { writeDesktopFile } = await import('@/app/tauri/files')
  await writeDesktopFile(path, bytes)
  rememberRecentFile(path)
  return { status: 'saved', name: basename(path) }
}

async function chooseBrowserTarget(fileName: string, extension: string) {
  try {
    return await pickBrowserSaveFile({
      suggestedName: fileName,
      types: [{ description: fileName, accept: { 'application/octet-stream': [`.${extension}`] } }]
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled' as const
    throw error
  }
}

/**
 * Saves a copy of a document where the person picks, leaving the document itself as it was. The
 * desktop app adds the copy to the recent files; a browser without a save picker, or one that
 * refuses to write the picked file, downloads the copy instead. The target is picked before the
 * bytes are read, since a browser offers its picker only right after a click.
 */
export async function saveDocumentCopy(source: DocumentCopySource): Promise<DocumentCopyResult> {
  const fileName = documentCopyFileName(source)
  const extension = extname(fileName).slice(1).toLowerCase() || 'fig'
  if (IS_TAURI) return saveCopyOnDesktop(source, fileName, extension)

  const handle = await chooseBrowserTarget(fileName, extension)
  if (handle === 'cancelled') return { status: 'cancelled' }
  const bytes = await documentBytes(source)
  if (handle) {
    try {
      const writable = await handle.createWritable()
      await writable.write(new Uint8Array(bytes))
      await writable.close()
      return { status: 'saved', name: handle.name }
    } catch (error) {
      if (!isFileWriteRefused(error)) throw error
    }
  }
  const name = handle?.name ?? fileName
  downloadBlob(bytes, name, 'application/octet-stream')
  return { status: 'saved', name }
}
