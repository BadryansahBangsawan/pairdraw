import { computed, shallowRef } from 'vue'

import { recoveryMessages } from '@pairdraw/vue/i18n'

import { applyImportedDocument } from '@/app/document/io/imported-document'
import { takeFileBackup } from '@/app/document/recovery/backups'
import { recoveryEnabled } from '@/app/document/recovery/preferences'
import { getRecoveryStore } from '@/app/document/recovery/store'
import type { RecoverySnapshotMeta } from '@/app/document/recovery/types'
import type { EditorStore } from '@/app/editor/session'
import { getTabForStore, readFigBytes, restoreRecoverySnapshot, switchTab } from '@/app/tabs'
import type { OpenedFile } from '@/app/tabs/open/events'

/** A file that opened with a backup of changes it never saved, waiting for the person's answer. */
export type RecoveredChanges = {
  store: EditorStore
  backup: RecoverySnapshotMeta
}

const waiting = shallowRef<readonly RecoveredChanges[]>([])

/** The recovered changes to ask about now; others wait their turn. */
export const recoveredChanges = computed(() => waiting.value.at(0) ?? null)

function settle(entry: RecoveredChanges): void {
  waiting.value = waiting.value.filter((candidate) => candidate !== entry)
}

/** Offers the backup of a file that just opened, when one was kept. */
export async function offerRecoveredChanges({
  store,
  identity,
  modifiedAt
}: OpenedFile): Promise<void> {
  if (!recoveryEnabled.value) return
  const backup = await takeFileBackup(identity, { modifiedAt })
  if (!backup || waiting.value.some((entry) => entry.backup.id === backup.id)) return
  waiting.value = [...waiting.value, { store, backup }]
}

async function readBackup(entry: RecoveredChanges) {
  const snapshot = await getRecoveryStore().read(entry.backup.id)
  if (!snapshot) throw new Error(recoveryMessages.get().backupUnavailable)
  return snapshot
}

/**
 * Carries out an answer, then moves on to the next file: the question stays up while the answer
 * runs, whether it succeeds or fails.
 */
async function answering<T>(entry: RecoveredChanges, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } finally {
    settle(entry)
  }
}

/**
 * Puts the recovered changes into the file's tab and saves them to the file. The tab keeps them
 * as its backup until the save succeeds. A tab closed meanwhile leaves the backup for next time.
 */
export function saveRecoveredChanges(entry: RecoveredChanges): Promise<boolean> {
  return answering(entry, async () => {
    const tab = getTabForStore(entry.store)
    if (!tab) return false
    const snapshot = await readBackup(entry)
    switchTab(tab.id)
    const graph = await readFigBytes(snapshot.figBytes, entry.store.state.documentName)
    await applyImportedDocument(entry.store, graph)
    await entry.store.switchPage(entry.store.graph.getPages()[0]?.id ?? entry.store.graph.rootId)
    await entry.store.fitCurrentPageToViewport()
    await entry.store.adoptRecoverySnapshot(entry.backup.id)
    return entry.store.saveFigFile()
  })
}

/**
 * Opens the recovered changes as a document of their own and asks where to save them; the file
 * stays as it is on disk.
 */
export function saveRecoveredChangesAs(entry: RecoveredChanges): Promise<boolean> {
  return answering(entry, async () => {
    await readBackup(entry)
    const store = await restoreRecoverySnapshot(entry.backup.id)
    return store.saveFigFileAs()
  })
}

/** Keeps the file as it is on disk and deletes the backup. */
export function discardRecoveredChanges(entry: RecoveredChanges): Promise<void> {
  return answering(entry, () => getRecoveryStore().remove(entry.backup.id))
}

/** Answers later: the backup stays and is offered the next time the file opens. */
export function postponeRecoveredChanges(entry: RecoveredChanges): void {
  settle(entry)
}
