import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { promiseTimeout } from '@vueuse/core'

import { createDocumentGraph } from '@pairdraw/core'
import { exportFigFile } from '@pairdraw/core/io/formats/fig'

import {
  DRAFT_PROVIDER_ID,
  deleteDraft,
  draftExists,
  listDrafts,
  onDraftsChanged,
  readDraft,
  writeDraft
} from '@/app/document/drafts/store'
import { evictLocalFigCache } from '@/app/storage/cache-eviction'
import {
  createMemoryLocalCanvasStore,
  getLocalCanvasStore,
  resetLocalCanvasStoreForTests
} from '@/app/storage/local-store'

async function figBytes(): Promise<Uint8Array> {
  return exportFigFile(createDocumentGraph('design'), { documentName: 'Untitled' })
}

beforeEach(() => {
  resetLocalCanvasStoreForTests(createMemoryLocalCanvasStore())
})

afterEach(() => {
  resetLocalCanvasStoreForTests()
})

describe('draft store', () => {
  test('keeps drafts in the local canvas store under a provider no storage location lists', async () => {
    const bytes = await figBytes()
    await writeDraft({ id: 'draft-1', name: 'Landing page', figBytes: bytes })

    const meta = await getLocalCanvasStore().getMeta('draft-1')
    expect(meta?.providerId).toBe(DRAFT_PROVIDER_ID)
    expect((await listDrafts()).map((draft) => draft.name)).toEqual(['Landing page'])
    expect((await readDraft('draft-1'))?.figBytes).toEqual(bytes)
  })

  test('lists only drafts, most recently changed first', async () => {
    await getLocalCanvasStore().writeCanvas({
      id: 'stored',
      providerId: 's3',
      name: 'Stored',
      figBytes: new Uint8Array([1])
    })
    await writeDraft({ id: 'older', name: 'Older', figBytes: await figBytes() })
    await promiseTimeout(5)
    await writeDraft({ id: 'newer', name: 'Newer', figBytes: await figBytes() })

    expect((await listDrafts()).map((draft) => draft.id)).toEqual(['newer', 'older'])
    expect(await readDraft('stored')).toBeNull()
  })

  test('cache eviction never drops a draft, which has no other copy', async () => {
    await writeDraft({ id: 'draft-1', name: 'Draft', figBytes: await figBytes() })
    await evictLocalFigCache(new Set(), 0)
    expect(await readDraft('draft-1')).not.toBeNull()
  })

  test('deleting removes only drafts and tells Home', async () => {
    const changes: string[] = []
    const { off } = onDraftsChanged((change) => changes.push(change.id))
    await getLocalCanvasStore().writeCanvas({
      id: 'stored',
      providerId: 's3',
      name: 'Stored',
      figBytes: new Uint8Array([1])
    })
    await writeDraft({ id: 'draft-1', name: 'Draft', figBytes: await figBytes() })

    await deleteDraft('stored')
    await deleteDraft('draft-1')
    off()

    expect(await getLocalCanvasStore().getMeta('stored')).not.toBeNull()
    expect(await listDrafts()).toEqual([])
    expect(changes).toEqual(['draft-1', 'draft-1'])
  })

  test('tells whether a draft is still kept', async () => {
    await writeDraft({ id: 'draft-1', name: 'Draft', figBytes: await figBytes() })
    expect(await draftExists('draft-1')).toBe(true)
    await deleteDraft('draft-1')
    expect(await draftExists('draft-1')).toBe(false)
  })

  test('other windows hear of drafts written and deleted, and this one of theirs', async () => {
    // Another window's end of the drafts channel.
    const port = new BroadcastChannel('pairdraw:drafts')
    const heard: unknown[] = []
    port.addEventListener('message', (event: MessageEvent<unknown>) => {
      heard.push(event.data)
    })
    const changes: string[] = []
    const { off } = onDraftsChanged((change) => changes.push(change.id))

    await writeDraft({ id: 'draft-1', name: 'Draft', figBytes: await figBytes() })
    await deleteDraft('draft-1')
    port.postMessage({ id: 'from-elsewhere' })
    port.postMessage({ unrelated: true })
    await promiseTimeout(20)
    off()
    port.close()

    expect(heard).toEqual([{ id: 'draft-1' }, { id: 'draft-1' }])
    expect(changes).toEqual(['draft-1', 'draft-1', 'from-elsewhere'])
  })
})
