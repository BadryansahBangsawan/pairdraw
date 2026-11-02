import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  canSaveDocumentCopy,
  documentCopyFileName,
  recentCopySource,
  storedDocumentBytes,
  type DocumentCopySource,
  type ProviderDocumentReader
} from '@/app/home/save-copy'
import type { RecentDocument } from '@/app/recent-files'
import { createMemoryLocalCanvasStore, type LocalCanvasStore } from '@/app/storage/local-store'
import { resetLocalCanvasStoreForTests } from '@/app/storage/local-store/store'
import type { LocalSyncStatus } from '@/app/storage/local-store/types'

const file: RecentDocument = {
  id: 'local:/work/Poster.fig',
  kind: 'local',
  path: '/work/Poster.fig',
  name: 'Poster.fig',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z'
}

const stored: RecentDocument = {
  id: 'storage:cloud:server:doc',
  kind: 'storage',
  providerId: 'cloud',
  profileId: 'server',
  containerId: 'workspace',
  documentId: 'doc',
  name: 'Landing page',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z'
}

describe('Save As from Home', () => {
  test('copies a stored recent document from where it is kept', () => {
    expect(recentCopySource(stored)).toEqual({
      kind: 'storage',
      documentId: 'doc',
      name: 'Landing page',
      location: { providerId: 'cloud', profileId: 'server', containerId: 'workspace' }
    })
  })

  test('copies a file on disk only where the app can read it', () => {
    const source = recentCopySource(file)
    expect(canSaveDocumentCopy(source, true)).toBe(true)
    expect(canSaveDocumentCopy(source, false)).toBe(false)
    expect(canSaveDocumentCopy(recentCopySource(stored), false)).toBe(true)
  })

  test('offers a file under its own name and a stored design as a .fig file', () => {
    expect(documentCopyFileName(recentCopySource(file))).toBe('Poster.fig')
    expect(documentCopyFileName(recentCopySource(stored))).toBe('Landing page.fig')
    const board: DocumentCopySource = {
      kind: 'storage',
      documentId: 'b',
      name: 'Retro.jam',
      location: { providerId: 's3' }
    }
    expect(documentCopyFileName(board)).toBe('Retro.jam')
  })
})

const BUCKET = { providerId: 's3-compatible' }
const CLOUD = { providerId: 'cloud', profileId: 'server', containerId: 'workspace' }
const LOCAL_BYTES = new Uint8Array([1, 2, 3])
const PROVIDER_BYTES = new Uint8Array([9, 9])

describe('the bytes Save As copies from storage', () => {
  let store: LocalCanvasStore
  let providerReads: string[]

  const provider: ProviderDocumentReader = async (documentId) => {
    providerReads.push(documentId)
    return PROVIDER_BYTES
  }
  const unreachable: ProviderDocumentReader = async (documentId) => {
    providerReads.push(documentId)
    throw new Error('offline')
  }

  async function keepCopy(location: typeof BUCKET | typeof CLOUD, syncStatus: LocalSyncStatus) {
    await store.writeCanvas({
      id: 'doc',
      ...location,
      name: 'Poster',
      figBytes: LOCAL_BYTES,
      syncStatus
    })
  }

  beforeEach(() => {
    store = createMemoryLocalCanvasStore()
    resetLocalCanvasStoreForTests(store)
    providerReads = []
  })

  afterEach(() => {
    resetLocalCanvasStoreForTests()
  })

  test("are this device's copy while it holds changes the provider has not got", async () => {
    await keepCopy(BUCKET, 'pending')
    expect(await storedDocumentBytes('doc', BUCKET, provider)).toEqual(LOCAL_BYTES)
    expect(providerReads).toEqual([])
  })

  test("are the provider's once this device's copy is synced", async () => {
    await keepCopy(BUCKET, 'synced')
    expect(await storedDocumentBytes('doc', BUCKET, provider)).toEqual(PROVIDER_BYTES)
    expect(providerReads).toEqual(['doc'])
  })

  test("fall back to this device's copy when the provider cannot answer", async () => {
    await keepCopy(BUCKET, 'synced')
    expect(await storedDocumentBytes('doc', BUCKET, unreachable)).toEqual(LOCAL_BYTES)
  })

  test('fail as the provider failed when this device keeps no copy', async () => {
    await expect(storedDocumentBytes('doc', BUCKET, unreachable)).rejects.toThrow('offline')
  })

  test('never come from a copy this device keeps for another location', async () => {
    await keepCopy(CLOUD, 'pending')
    expect(await storedDocumentBytes('doc', BUCKET, provider)).toEqual(PROVIDER_BYTES)
    await expect(storedDocumentBytes('doc', BUCKET, unreachable)).rejects.toThrow('offline')
  })
})
