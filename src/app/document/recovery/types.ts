import type { DocumentSourceIdentity } from '@/app/document/io/types'

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
  source?: DocumentSourceIdentity
}

export interface RecoverySnapshot extends RecoverySnapshotMeta {
  figBytes: Uint8Array
}

export interface RecoverySnapshotInput {
  id: string
  documentName: string
  figBytes: Uint8Array
  source?: DocumentSourceIdentity | null
}

export interface RecoveryStore {
  list(): Promise<RecoverySnapshotMeta[]>
  read(id: string): Promise<RecoverySnapshot | null>
  write(input: RecoverySnapshotInput): Promise<RecoverySnapshotMeta>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}
