import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as layoutModule from '@pairdraw/core/layout'

import { getRecoveryStore, resetRecoveryStoreForTests } from '@/app/document/recovery'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import { closeTab, createHomeTab, createTab, getTabById } from '@/app/tabs'

import { asDouble } from '#tests/helpers/doubles'
import { clearTabGlobals, setupTabGlobals } from '#tests/helpers/tabs/globals'

/** A browser file handle that takes writes and is the same entry only as itself. */
function fileHandle(name: string) {
  const handle = asDouble<FileSystemFileHandle>({
    kind: 'file',
    name,
    isSameEntry: async (other: FileSystemHandle) => other === handle,
    getFile: async () => new File([], name),
    createWritable: async () => ({ write: async () => undefined, close: async () => undefined })
  })
  return handle
}

/** A file-backed document with unsaved changes kept as a copy, as closing it leaves it. */
async function tabWithRecoveryCopy() {
  const tab = createTab()
  tab.store.setDocumentSource('landing.fig', 'fig', fileHandle('landing.fig'))
  tab.store.createShape('RECTANGLE', 0, 0, 10, 10)
  const recoveryId = tab.store.getRecoveryId()
  await tab.store.persistRecoveryNow()
  expect(await getRecoveryStore().read(recoveryId)).not.toBeNull()
  return { tab, recoveryId }
}

beforeEach(() => {
  setupTabGlobals()
  resetRecoveryStoreForTests(createMemoryRecoveryStore())
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
  createHomeTab()
})

afterEach(() => {
  vi.restoreAllMocks()
  resetRecoveryStoreForTests()
  clearTabGlobals()
})

describe('closing a document for automation', () => {
  test('with discard keeps the recovery copy of a file’s unsaved changes', async () => {
    const { tab, recoveryId } = await tabWithRecoveryCopy()

    await closeTab(tab.id, 'discard', { keepCopies: true })

    expect(getTabById(tab.id)).toBeUndefined()
    expect(await getRecoveryStore().read(recoveryId)).not.toBeNull()
  })

  test('a deletion’s discard drops the copies, as the person asked', async () => {
    const { tab, recoveryId } = await tabWithRecoveryCopy()

    await closeTab(tab.id, 'discard')

    expect(getTabById(tab.id)).toBeUndefined()
    expect(await getRecoveryStore().read(recoveryId)).toBeNull()
  })
})
