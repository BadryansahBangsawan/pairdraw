import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as layoutModule from '@pairdraw/core/layout'

import { getRecoveryStore, resetRecoveryStoreForTests } from '@/app/document/recovery'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import { createHomeTab, openKeptDocument, tabCount } from '@/app/tabs'

import { testPath } from '#tests/helpers/paths'
import { clearTabGlobals, setupTabGlobals } from '#tests/helpers/tabs/globals'

beforeEach(() => {
  setupTabGlobals()
  resetRecoveryStoreForTests(createMemoryRecoveryStore())
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
  createHomeTab()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  resetRecoveryStoreForTests()
  clearTabGlobals()
})

describe('a document that fails to open', () => {
  test('leaves no recovery copy behind, even after its document was applied', async () => {
    const bytes = new Uint8Array(await Bun.file(testPath('fixtures', 'slots.fig')).arrayBuffer())
    const count = tabCount()
    vi.useFakeTimers()

    await expect(
      openKeptDocument({
        name: 'slots',
        bytes,
        kind: 'document-open',
        // The document is laid out and in the tab before the caller's own step fails.
        adopt: () => {
          throw new Error('adopt failed')
        }
      })
    ).rejects.toThrow('adopt failed')

    expect(tabCount()).toBe(count)
    expect(await getRecoveryStore().list()).toEqual([])
    // A copy the removed tab queued would land after recovery's own debounce: the tab's store
    // went with it, so advancing the clock past that wait writes nothing.
    vi.advanceTimersByTime(4000)
    expect(await getRecoveryStore().list()).toEqual([])
  })
})
