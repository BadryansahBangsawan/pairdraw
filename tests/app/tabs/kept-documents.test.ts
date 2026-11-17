import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as figModule from '@pairdraw/core/io/formats/fig'
import * as layoutModule from '@pairdraw/core/layout'
import { SceneGraph } from '@pairdraw/scene-graph'

import { getRecoveryStore, resetRecoveryStoreForTests } from '@/app/document/recovery'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import {
  createMemoryLocalCanvasStore,
  resetLocalCanvasStoreForTests
} from '@/app/storage/local-store'
import { createHomeTab, getTabForStore, restoreRecoverySnapshot, tabCount } from '@/app/tabs'

import { clearTabGlobals, settleTabs, setupTabGlobals } from '#tests/helpers/tabs/globals'

/** A kept document with no file, as restoring a recovery copy from Home leaves it. */
async function keepSnapshot(id: string, documentName: string): Promise<void> {
  await getRecoveryStore().write({ id, documentName, figBytes: new Uint8Array([1]) })
}

beforeEach(() => {
  setupTabGlobals()
  resetLocalCanvasStoreForTests(createMemoryLocalCanvasStore())
  resetRecoveryStoreForTests(createMemoryRecoveryStore())
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
  vi.spyOn(figModule, 'readFigFile').mockResolvedValue(new SceneGraph())
  createHomeTab()
})

afterEach(() => {
  vi.restoreAllMocks()
  resetLocalCanvasStoreForTests()
  resetRecoveryStoreForTests()
  clearTabGlobals()
})

describe('opening a kept document', () => {
  test('never takes the place of a recovered one, which keeps its copy', async () => {
    await keepSnapshot('first', 'Untitled')
    const first = await settleTabs(restoreRecoverySnapshot('first'))
    const firstTab = getTabForStore(first)
    expect(firstTab?.store).toBe(first)
    const count = tabCount()

    await keepSnapshot('second', 'Other')
    const second = await settleTabs(restoreRecoverySnapshot('second'))

    expect(second).not.toBe(first)
    expect(getTabForStore(first)).toBe(firstTab)
    expect(first.state.documentName).toBe('Untitled')
    expect(tabCount()).toBe(count + 1)
    expect(await getRecoveryStore().read('first')).not.toBeNull()
  })
})
