import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as layoutModule from '@pairdraw/core/layout'

import type { DocumentSourceIdentity } from '@/app/document/io/types'
import type { RecoverySnapshot, RecoveryStore } from '@/app/document/recovery'
import { getRecoveryStore, resetRecoveryStoreForTests } from '@/app/document/recovery'
import { findFileBackups } from '@/app/document/recovery/backups'
import { recoverySnapshotMeta } from '@/app/document/recovery/meta'
import { setRecoveryRuntimeOverride } from '@/app/document/recovery/preferences'
import {
  discardRecoveredChanges,
  offerRecoveredChanges,
  postponeRecoveredChanges,
  recoveredChanges,
  saveRecoveredChanges,
  saveRecoveredChangesAs
} from '@/app/document/recovery/recovered'
import { closeTab, createHomeTab, createTab } from '@/app/tabs'

import { asDouble } from '#tests/helpers/doubles'
import { clearTabGlobals, setupTabGlobals } from '#tests/helpers/tabs/globals'

/**
 * Keeps copies as given. The memory store clones them as IndexedDB does, which a stand-in file
 * handle, whose methods are functions, cannot survive.
 */
function referenceRecoveryStore(): RecoveryStore {
  const snapshots = new Map<string, RecoverySnapshot>()
  return {
    async list() {
      return [...snapshots.values()].toSorted((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      )
    },
    async read(id) {
      return snapshots.get(id) ?? null
    },
    async write(input) {
      const snapshot: RecoverySnapshot = {
        ...recoverySnapshotMeta(input),
        figBytes: input.figBytes
      }
      snapshots.set(input.id, snapshot)
      return snapshot
    },
    async remove(id) {
      snapshots.delete(id)
    },
    async clear() {
      snapshots.clear()
    }
  }
}

/** A browser file handle that takes writes and is the same entry only as itself. */
function fileHandle(name: string) {
  const writes: Uint8Array[] = []
  const handle = asDouble<FileSystemFileHandle>({
    kind: 'file',
    name,
    isSameEntry: async (other: FileSystemHandle) => other === handle,
    getFile: async () => new File([], name),
    createWritable: async () => ({
      write: async (data: Uint8Array) => {
        writes.push(data)
      },
      close: async () => undefined
    })
  })
  return { handle, writes }
}

/** An open tab for the file, as opening it leaves it. */
function openFile(identity: DocumentSourceIdentity) {
  const tab = createTab()
  tab.store.setDocumentSource('landing.fig', 'fig', identity.handle ?? undefined)
  return tab
}

async function keepBackup(id: string, identity: DocumentSourceIdentity) {
  return getRecoveryStore().write({
    id,
    documentName: 'landing',
    figBytes: new Uint8Array([1]),
    source: identity
  })
}

/** Answers whatever is still asked, so one test's question does not reach the next. */
function answerAll() {
  for (let entry = recoveredChanges.value; entry; entry = recoveredChanges.value) {
    postponeRecoveredChanges(entry)
  }
}

beforeEach(() => {
  setupTabGlobals()
  setRecoveryRuntimeOverride(true)
  resetRecoveryStoreForTests(referenceRecoveryStore())
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
  createHomeTab()
})

afterEach(() => {
  answerAll()
  vi.restoreAllMocks()
  setRecoveryRuntimeOverride(null)
  resetRecoveryStoreForTests()
  clearTabGlobals()
})

describe('recovered changes', () => {
  test('a backup answered later is gone once the file is saved, so it is never offered over it', async () => {
    const { handle, writes } = fileHandle('landing.fig')
    const identity = { handle, path: null }
    await keepBackup('earlier-session', identity)
    const tab = openFile(identity)

    await offerRecoveredChanges({ store: tab.store, identity })
    const entry = recoveredChanges.value
    expect(entry?.backup.id).toBe('earlier-session')
    if (entry) postponeRecoveredChanges(entry)

    tab.store.createShape('RECTANGLE', 0, 0, 10, 10)
    expect(await tab.store.saveFigFile()).toBe(true)
    expect(writes).toHaveLength(1)
    expect(await findFileBackups(identity)).toEqual([])

    await offerRecoveredChanges({ store: tab.store, identity })
    expect(recoveredChanges.value).toBeNull()
    await closeTab(tab.id)
  })

  test('a backup older than the file’s last change is not offered', async () => {
    const { handle } = fileHandle('landing.fig')
    const identity = { handle, path: null }
    const backup = await keepBackup('stale', identity)
    const tab = openFile(identity)

    await offerRecoveredChanges({
      store: tab.store,
      identity,
      modifiedAt: Date.parse(backup.updatedAt) + 1000
    })
    expect(recoveredChanges.value).toBeNull()
    expect(await getRecoveryStore().read('stale')).toBeNull()
    await closeTab(tab.id)
  })

  test('the question stays while Don’t Save runs, then the backup is gone', async () => {
    const { handle } = fileHandle('landing.fig')
    const identity = { handle, path: null }
    await keepBackup('backup', identity)
    const tab = openFile(identity)
    await offerRecoveredChanges({ store: tab.store, identity })
    const entry = recoveredChanges.value
    if (!entry) throw new Error('No question asked')

    const discarding = discardRecoveredChanges(entry)
    expect(recoveredChanges.value).toBe(entry)
    await discarding
    expect(recoveredChanges.value).toBeNull()
    expect(await getRecoveryStore().read('backup')).toBeNull()
    await closeTab(tab.id)
  })

  test('Save for a tab closed meanwhile keeps the backup for the next open', async () => {
    const { handle } = fileHandle('landing.fig')
    const identity = { handle, path: null }
    await keepBackup('backup', identity)
    const tab = openFile(identity)
    await offerRecoveredChanges({ store: tab.store, identity })
    const entry = recoveredChanges.value
    if (!entry) throw new Error('No question asked')
    await closeTab(tab.id)

    expect(await saveRecoveredChanges(entry)).toBe(false)
    expect(recoveredChanges.value).toBeNull()
    expect(await getRecoveryStore().read('backup')).not.toBeNull()
  })

  test('Save As for a backup no longer kept says so and moves on', async () => {
    const { handle } = fileHandle('landing.fig')
    const identity = { handle, path: null }
    await keepBackup('backup', identity)
    const tab = openFile(identity)
    await offerRecoveredChanges({ store: tab.store, identity })
    const entry = recoveredChanges.value
    if (!entry) throw new Error('No question asked')
    await getRecoveryStore().remove('backup')

    await expect(saveRecoveredChangesAs(entry)).rejects.toThrow('no longer available')
    expect(recoveredChanges.value).toBeNull()
    await closeTab(tab.id)
  })

  test('files that open together are asked about one at a time', async () => {
    const first = fileHandle('first.fig')
    const second = fileHandle('second.fig')
    const firstIdentity = { handle: first.handle, path: null }
    const secondIdentity = { handle: second.handle, path: null }
    await keepBackup('first-backup', firstIdentity)
    await keepBackup('second-backup', secondIdentity)
    const firstTab = openFile(firstIdentity)
    const secondTab = openFile(secondIdentity)

    await offerRecoveredChanges({ store: firstTab.store, identity: firstIdentity })
    await offerRecoveredChanges({ store: secondTab.store, identity: secondIdentity })
    const asked = recoveredChanges.value
    expect(asked?.backup.id).toBe('first-backup')
    if (asked) postponeRecoveredChanges(asked)
    expect(recoveredChanges.value?.backup.id).toBe('second-backup')
    await closeTab(firstTab.id)
    await closeTab(secondTab.id)
  })
})
