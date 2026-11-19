import { describe, expect, test } from 'bun:test'

import { promiseTimeout } from '@vueuse/core'
import { reactive, ref } from 'vue'

import type { DocumentSourceIdentity } from '@/app/document/io/types'
import {
  FILE_BACKUP_UNCLAIMED_MS,
  findFileBackups,
  listedAtStartup,
  removeFileBackups,
  takeFileBackup
} from '@/app/document/recovery/backups'
import { createDocumentRecovery } from '@/app/document/recovery/controller'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'

const FILE: DocumentSourceIdentity = { handle: null, path: '/designs/landing.fig' }
const FILE_STORED = { handleName: null, path: '/designs/landing.fig' }

/** An open file; its backups hold the revision they were built at. */
function setup() {
  const state = reactive({ documentName: 'landing' })
  const version = ref(0)
  const store = createMemoryRecoveryStore()
  const attached = ref(true)
  const autosave = ref(true)
  const draft = ref(false)
  const stored = ref(false)
  const recovery = createDocumentRecovery({
    state,
    version: () => version.value,
    store,
    recoveryId: 'backup-1',
    hasWritableSource: () => attached.value || stored.value,
    fileSource: () => (attached.value ? FILE : null),
    autosaveCovers: () => autosave.value,
    keptElsewhere: () => draft.value,
    buildFigFile: async () => new Uint8Array([version.value])
  })
  return { version, store, recovery, attached, autosave, draft, stored }
}

describe('file backups', () => {
  test('backs up a file’s unsaved changes with the file they belong to', async () => {
    const { version, store, recovery } = setup()
    version.value = 1
    await recovery.persistNow()
    const backup = await store.read('backup-1')
    expect(backup?.source).toEqual(FILE_STORED)
    expect(backup?.figBytes[0]).toBe(1)
    recovery.disposeRecovery()
  })

  test('a save to the file drops its backup', async () => {
    const { version, store, recovery } = setup()
    version.value = 1
    await recovery.persistNow()
    await recovery.markProtectedVersion(1)
    expect(await store.list()).toEqual([])
    recovery.disposeRecovery()
  })

  test('while autosave writes the file, only an explicit persist backs it up', async () => {
    const { version, store, recovery, autosave } = setup()
    version.value = 1
    await promiseTimeout(3200)
    expect(await store.list()).toEqual([])

    autosave.value = false
    version.value = 2
    await promiseTimeout(3200)
    expect((await store.read('backup-1'))?.figBytes[0]).toBe(2)
    recovery.disposeRecovery()
  }, 10_000)

  test('turning autosave off backs up the edits it had not written', async () => {
    const { version, store, recovery, autosave } = setup()
    version.value = 1
    await promiseTimeout(3200)
    // Autosave was writing the file within the same wait, so no backup was made.
    expect(await store.list()).toEqual([])

    autosave.value = false
    await promiseTimeout(50)
    expect((await store.read('backup-1'))?.figBytes[0]).toBe(1)
    recovery.disposeRecovery()
  }, 10_000)

  test('a document stored elsewhere or kept as a draft gets no copy', async () => {
    const { version, store, recovery, attached, draft, stored } = setup()
    draft.value = true
    version.value = 1
    await recovery.persistNow()
    expect(await store.list()).toEqual([])

    // Storage keeps a document that saves in place but to no file.
    draft.value = false
    attached.value = false
    stored.value = true
    version.value = 2
    await recovery.persistNow()
    expect(await store.list()).toEqual([])
    recovery.disposeRecovery()
  })

  test('a document with no source keeps a recovery copy with no file', async () => {
    const store = createMemoryRecoveryStore()
    const version = ref(0)
    const recovery = createDocumentRecovery({
      state: reactive({ documentName: 'Untitled' }),
      version: () => version.value,
      store,
      recoveryId: 'copy',
      hasWritableSource: () => false,
      fileSource: () => null,
      buildFigFile: async () => new Uint8Array([version.value])
    })
    version.value = 1
    await recovery.persistNow()
    const copy = await store.read('copy')
    expect(copy).not.toBeNull()
    expect(copy?.source).toBeUndefined()
    recovery.disposeRecovery()
  })

  test('opening a file offers its newest backup and drops older ones', async () => {
    const store = createMemoryRecoveryStore()
    await store.write({
      id: 'older',
      documentName: 'landing',
      figBytes: new Uint8Array([1]),
      source: FILE
    })
    await promiseTimeout(5)
    await store.write({
      id: 'newer',
      documentName: 'landing',
      figBytes: new Uint8Array([2]),
      source: FILE
    })
    await store.write({
      id: 'other',
      documentName: 'other',
      figBytes: new Uint8Array([3]),
      source: { handle: null, path: '/designs/other.fig' }
    })
    await store.write({ id: 'sourceless', documentName: 'Untitled', figBytes: new Uint8Array([4]) })

    expect((await findFileBackups(FILE, store)).map((backup) => backup.id)).toEqual([
      'newer',
      'older'
    ])
    expect((await takeFileBackup(FILE, { store }))?.id).toBe('newer')
    expect((await store.list()).map((snapshot) => snapshot.id).toSorted()).toEqual([
      'newer',
      'other',
      'sourceless'
    ])
    expect(await takeFileBackup({ handle: null, path: '/designs/new.fig' }, { store })).toBeNull()
  })

  test('a save deletes the file’s other backups but not the saving document’s own', async () => {
    const store = createMemoryRecoveryStore()
    for (const id of ['earlier-session', 'own']) {
      await store.write({
        id,
        documentName: 'landing',
        figBytes: new Uint8Array([1]),
        source: FILE
      })
    }
    await store.write({
      id: 'other',
      documentName: 'other',
      figBytes: new Uint8Array([2]),
      source: { handle: null, path: '/designs/other.fig' }
    })

    await removeFileBackups(FILE, { except: 'own', store })
    expect((await store.list()).map((snapshot) => snapshot.id).toSorted()).toEqual(['other', 'own'])
  })

  test('a backup older than the file’s last change is not offered and goes', async () => {
    const store = createMemoryRecoveryStore()
    const backup = await store.write({
      id: 'backup',
      documentName: 'landing',
      figBytes: new Uint8Array([1]),
      source: FILE
    })
    const takenAt = Date.parse(backup.updatedAt)

    expect((await takeFileBackup(FILE, { modifiedAt: takenAt - 1000, store }))?.id).toBe('backup')
    expect(await takeFileBackup(FILE, { modifiedAt: takenAt + 1000, store })).toBeNull()
    expect(await store.list()).toEqual([])
  })

  test('the startup dialog lists a file’s backup only once it went unclaimed for long', () => {
    const now = Date.parse('2026-11-03T12:00:00Z')
    const meta = {
      id: 'backup',
      documentName: 'landing',
      byteLength: 1,
      formatVersion: 1 as const,
      updatedAt: new Date(now - 1000).toISOString()
    }
    expect(listedAtStartup(meta, now)).toBe(true)
    expect(listedAtStartup({ ...meta, source: FILE_STORED }, now)).toBe(false)
    const unclaimed = new Date(now - FILE_BACKUP_UNCLAIMED_MS).toISOString()
    expect(listedAtStartup({ ...meta, source: FILE_STORED, updatedAt: unclaimed }, now)).toBe(true)
  })
})
