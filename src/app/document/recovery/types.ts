import type { DocumentSourceIdentity } from '@/app/document/io/types'

/**
 * The shape of a file recorded in a stored snapshot. A live handle cannot be stored: Chromium
 * crashes when deserializing one from IndexedDB, so only the file's path and, for a browser file,
 * its name survive.
 */
export type StoredSourceIdentity = Readonly<{
  handleName: string | null
  path: string | null
}>

export interface RecoverySnapshotMeta {
  id: string
  documentName: string
  updatedAt: string
  byteLength: number
  formatVersion: 1
  /**
   * The file these are unsaved changes to, which makes the copy a backup offered when that file
   * opens again; a copy of a document with no file has none.
   */
  source?: StoredSourceIdentity
}

export interface RecoverySnapshot extends RecoverySnapshotMeta {
  figBytes: Uint8Array
}

export interface RecoverySnapshotInput {
  id: string
  documentName: string
  figBytes: Uint8Array
  /**
   * A live file, as the document holds it, or a stored source, as a snapshot read back from a
   * store holds it.
   */
  source?: DocumentSourceIdentity | StoredSourceIdentity | null
}

export interface RecoveryStore {
  list(): Promise<RecoverySnapshotMeta[]>
  read(id: string): Promise<RecoverySnapshot | null>
  write(input: RecoverySnapshotInput): Promise<RecoverySnapshotMeta>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}
