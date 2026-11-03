import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { getRecoveryStore } from '@/app/document/recovery/store'
import type { RecoverySnapshotMeta, RecoveryStore } from '@/app/document/recovery/types'
import { fileIdentitiesMatch } from '@/app/tabs/open/identity'

/**
 * How long a file's backup waits for that file to open again before the startup Recover dialog
 * lists it too, as a file moved, renamed or never reopened would otherwise hide it for good.
 */
export const FILE_BACKUP_UNCLAIMED_MS = 7 * 24 * 60 * 60 * 1000

/** The backups of unsaved changes kept for this file, newest first. */
export async function findFileBackups(
  identity: DocumentSourceIdentity,
  store: RecoveryStore = getRecoveryStore()
): Promise<RecoverySnapshotMeta[]> {
  const matches: RecoverySnapshotMeta[] = []
  for (const snapshot of await store.list()) {
    if (snapshot.source && (await fileIdentitiesMatch(snapshot.source, identity))) {
      matches.push(snapshot)
    }
  }
  return matches
}

/**
 * Deletes the file's backups once it was saved: they hold changes older than the file now does.
 * `except` is the saving document's own backup, which may already hold newer changes.
 */
export async function removeFileBackups(
  identity: DocumentSourceIdentity,
  { except, store = getRecoveryStore() }: { except?: string; store?: RecoveryStore } = {}
): Promise<void> {
  const backups = await findFileBackups(identity, store)
  await Promise.all(
    backups.filter((backup) => backup.id !== except).map((backup) => store.remove(backup.id))
  )
}

/**
 * The backup to offer for a file that just opened: the newest one, which holds the latest
 * changes. Older backups of the same file are stale and go, as do backups older than the file's
 * last change when `modifiedAt` gives it: the file already holds something newer.
 */
export async function takeFileBackup(
  identity: DocumentSourceIdentity,
  { modifiedAt, store = getRecoveryStore() }: { modifiedAt?: number; store?: RecoveryStore } = {}
): Promise<RecoverySnapshotMeta | null> {
  const backups = await findFileBackups(identity, store)
  const newest = backups.at(0)
  const current =
    newest && (modifiedAt === undefined || Date.parse(newest.updatedAt) >= modifiedAt)
      ? newest
      : null
  await Promise.all(
    backups.filter((backup) => backup !== current).map((backup) => store.remove(backup.id))
  )
  return current
}

/**
 * Whether the startup Recover dialog lists this copy: a document with no file always, a file's
 * backup once it went unclaimed for long.
 */
export function listedAtStartup(snapshot: RecoverySnapshotMeta, now = Date.now()): boolean {
  if (!snapshot.source) return true
  return now - Date.parse(snapshot.updatedAt) >= FILE_BACKUP_UNCLAIMED_MS
}
