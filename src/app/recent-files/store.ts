import { useLocalStorage } from '@vueuse/core'
import { basename } from 'pathe'
import * as v from 'valibot'
import { computed } from 'vue'

import {
  DEFAULT_STORAGE_PROFILE,
  storageLocationOf,
  storageProfileId,
  type StorageDocumentBinding
} from '@/app/integrations/storage'

import { recentFilesLimit } from './preferences'
import { recentDocumentSchema } from './schema'
import { clearRecentFileThumbnails } from './thumbnails'

const RECENT_DOCUMENTS_STORAGE_KEY = 'pairdraw:recent-documents'

export type RecentDocument = v.InferOutput<typeof recentDocumentSchema>

const storedRecentDocumentsSchema = v.pipe(v.string(), v.parseJson(), v.array(v.unknown()))

/**
 * The recent documents kept in `raw`. An entry this version cannot read is dropped rather than
 * emptying the list, and one kept before creation dates were recorded is dated by its last use.
 */
export function readStoredRecentDocuments(raw: string): RecentDocument[] {
  const parsed = v.safeParse(storedRecentDocumentsSchema, raw)
  if (!parsed.success) return []
  return parsed.output.flatMap((entry): RecentDocument[] => {
    const document = v.safeParse(recentDocumentSchema, entry)
    return document.success ? [document.output] : []
  })
}

export const recentDocuments = useLocalStorage<RecentDocument[]>(RECENT_DOCUMENTS_STORAGE_KEY, [], {
  serializer: { read: readStoredRecentDocuments, write: (documents) => JSON.stringify(documents) }
})

function fileName(path: string): string {
  return basename(path) || path
}

function localDocumentId(path: string): string {
  return `local:${path}`
}

function storageDocumentId(binding: StorageDocumentBinding): string {
  const profileId = storageProfileId(binding)
  // Documents of single-account providers keep the IDs they had before profiles existed.
  return profileId === DEFAULT_STORAGE_PROFILE
    ? `storage:${binding.providerId}:${binding.documentId}`
    : `storage:${binding.providerId}:${profileId}:${binding.documentId}`
}

function normalizedRecentDocuments(): RecentDocument[] {
  return recentDocuments.value.slice(0, recentFilesLimit.value)
}

export const recentFiles = computed<RecentDocument[]>(normalizedRecentDocuments)

export const recentLocalFilePaths = computed<string[]>(() =>
  normalizedRecentDocuments().flatMap((document) =>
    document.kind === 'local' ? [document.path] : []
  )
)

/** Puts a document first; one already listed keeps the date it was first added. */
function remember(document: RecentDocument): void {
  const createdAt =
    recentDocuments.value.find((recent) => recent.id === document.id)?.createdAt ??
    document.createdAt
  recentDocuments.value = [
    { ...document, createdAt },
    ...normalizedRecentDocuments().filter((recent) => recent.id !== document.id)
  ].slice(0, recentFilesLimit.value)
}

export function rememberRecentFile(path: string): void {
  const now = new Date().toISOString()
  remember({
    id: localDocumentId(path),
    kind: 'local',
    path,
    name: fileName(path),
    updatedAt: now,
    createdAt: now
  })
}

export function rememberRecentStorageDocument(binding: StorageDocumentBinding, name: string): void {
  const now = new Date().toISOString()
  remember({
    id: storageDocumentId(binding),
    kind: 'storage',
    ...storageLocationOf(binding),
    documentId: binding.documentId,
    name,
    updatedAt: now,
    createdAt: now
  })
}

export function forgetRecentDocument(id: string): void {
  forgetRecentDocuments([id])
}

/** Removes documents from the recent files; the files themselves stay where they are. */
export function forgetRecentDocuments(ids: Iterable<string>): void {
  const forgotten = new Set(ids)
  recentDocuments.value = normalizedRecentDocuments().filter(
    (document) => !forgotten.has(document.id)
  )
}

export function forgetRecentFile(path: string): void {
  forgetRecentDocument(localDocumentId(path))
}

export function forgetRecentStorageDocument(binding: StorageDocumentBinding): void {
  forgetRecentDocument(storageDocumentId(binding))
}

/** Forgets every recent document a provider keeps for one account, as when another signs in. */
export function forgetRecentStorageProfile(providerId: string, profileId: string): void {
  forgetRecentDocuments(
    normalizedRecentDocuments()
      .filter(
        (document) =>
          document.kind === 'storage' &&
          document.providerId === providerId &&
          (document.profileId ?? 'default') === profileId
      )
      .map((document) => document.id)
  )
}

export async function clearRecentFiles(): Promise<void> {
  recentDocuments.value = []
  await clearRecentFileThumbnails()
}

export function recentLocalFileAt(index: number): string | null {
  return recentLocalFilePaths.value[index] ?? null
}
