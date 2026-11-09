import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { IDBFactory } from 'fake-indexeddb'

import { createConversationStore } from '@/app/ai/chat/history/idb'

import { asDouble } from '#tests/helpers/doubles'

/** The handle slice resolveFile reads: the file it describes and the entry it is. */
function fakeHandle() {
  const handle = asDouble<FileSystemFileHandle>({
    kind: 'file',
    name: 'design.fig',
    isSameEntry: async (other: FileSystemFileHandle) =>
      other.name === 'design.fig' && other === handle,
    getFile: async () =>
      new File([new Uint8Array([1, 2, 3])], 'design.fig', { lastModified: 1_700_000_000_000 })
  })
  return handle
}

/** A handle getFile reads one size from, without saying who it compares to. */
function fileWithSize(size: number) {
  const handle = asDouble<FileSystemFileHandle>({
    kind: 'file',
    name: 'design.fig',
    isSameEntry: async (other: FileSystemFileHandle) =>
      other.name === 'design.fig' && other === handle,
    getFile: async () =>
      new File([new Uint8Array(size)], 'design.fig', { lastModified: 1_700_000_000_000 })
  })
  return handle
}

describe('chat file identity', () => {
  const sharedFactory = indexedDB

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        locks: { request: async (_name: string, callback: () => Promise<unknown>) => callback() }
      },
      writable: true
    })
  })

  afterAll(() => {
    globalThis.indexedDB = sharedFactory
    Reflect.deleteProperty(globalThis, 'navigator')
  })

  test('the same file is the same id within one session, and the row holds no live handle', async () => {
    const store = createConversationStore()
    const first = fakeHandle()
    const firstId = await store.resolveFile(first)
    expect(firstId).toMatch(/^browser-file:/)
    expect(await store.resolveFile(first)).toBe(firstId)

    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open('open-pencil-chats')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const rows: unknown[] = await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').getAll()
      request.onsuccess = () => resolve(request.result as unknown[])
      request.onerror = () => reject(request.error)
    })
    expect(rows).toHaveLength(1)
    const [stored] = rows as Array<Record<string, unknown>>
    expect(stored).toMatchObject({ name: 'design.fig', size: 3 })
    expect('getFile' in stored).toBe(false)
    expect('isSameEntry' in stored).toBe(false)
  })

  test('after a restart the same facts give the same id, and changed bytes give a new one', async () => {
    const first = createConversationStore()
    const handle = fileWithSize(3)
    const firstId = await first.resolveFile(handle)

    // Simulate a restart: the in-session entry map is gone, the handle is a new object.
    const reopened = createConversationStore()
    const again = fileWithSize(3)
    expect(await reopened.resolveFile(again)).toBe(firstId)

    const edited = fileWithSize(4)
    expect(await reopened.resolveFile(edited)).not.toBe(firstId)
  })

  test('files that differ only by name are distinct', async () => {
    const store = createConversationStore()
    const first = fileWithSize(3)
    const other = asDouble<FileSystemFileHandle>({
      kind: 'file',
      name: 'other.fig',
      isSameEntry: async (o: FileSystemFileHandle) => o.name === 'other.fig' && o === other,
      getFile: async () => new File([new Uint8Array([1, 2, 3])], 'other.fig')
    })
    const firstId = await store.resolveFile(first)
    expect(await store.resolveFile(other)).not.toBe(firstId)
  })
})
