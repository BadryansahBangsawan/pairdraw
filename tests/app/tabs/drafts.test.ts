import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import { createDocumentGraph } from '@open-pencil/core'
import * as figModule from '@open-pencil/core/io/formats/fig'
import * as layoutModule from '@open-pencil/core/layout'
import { SceneGraph } from '@open-pencil/scene-graph'

import { readDraft, writeDraft } from '@/app/document/drafts/store'
import { getRecoveryStore, resetRecoveryStoreForTests } from '@/app/document/recovery'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import {
  createMemoryLocalCanvasStore,
  resetLocalCanvasStoreForTests
} from '@/app/storage/local-store'
import {
  closeTab,
  createHomeTab,
  createTab,
  getTabById,
  restoreRecoverySnapshot,
  tabCount
} from '@/app/tabs'
import { deleteDraftEverywhere, openDraftInTab } from '@/app/tabs/open/draft'

import { clearTabGlobals, settleTabs, setupTabGlobals } from '#tests/helpers/tabs/globals'

const exportFigFile = figModule.exportFigFile

async function keepDraft(id: string): Promise<void> {
  const figBytes = await exportFigFile(createDocumentGraph('design'), { documentName: 'Kept' })
  await writeDraft({ id, name: 'Kept', figBytes })
}

/** A tab showing the draft, as opening it from Home leaves it. */
function draftTab(id: string) {
  const tab = createTab()
  tab.store.adoptDraft(id)
  return tab
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

describe('closing a draft', () => {
  test('Don’t Save drops this session’s changes but keeps the draft opened from Home', async () => {
    await keepDraft('kept')
    const tab = draftTab('kept')
    tab.store.createShape('RECTANGLE', 0, 0, 10, 10)
    expect(tab.store.hasUnsavedChanges()).toBe(true)

    await closeTab(tab.id, 'discard')
    expect(getTabById(tab.id)).toBeUndefined()
    expect(await readDraft('kept')).not.toBeNull()
  })

  test('an agent closing an unchanged draft with discard keeps it', async () => {
    await keepDraft('kept')
    const tab = draftTab('kept')
    await closeTab(tab.id, 'discard')
    expect(getTabById(tab.id)).toBeUndefined()
    expect(await readDraft('kept')).not.toBeNull()
  })

  test('Delete draft closes the tab showing it and deletes it', async () => {
    await keepDraft('kept')
    const tab = draftTab('kept')
    tab.store.createShape('RECTANGLE', 0, 0, 10, 10)
    await deleteDraftEverywhere('kept')
    expect(getTabById(tab.id)).toBeUndefined()
    expect(await readDraft('kept')).toBeNull()
  })
})

describe('opening drafts', () => {
  test('opening a draft already shown switches to its tab', async () => {
    await keepDraft('kept')
    const tab = draftTab('kept')
    createTab()
    const count = tabCount()
    expect(await openDraftInTab('kept')).toBe(tab.store)
    expect(tabCount()).toBe(count)
  })

  test('a document opening never takes the place of an unchanged draft', async () => {
    await keepDraft('kept')
    const tab = draftTab('kept')
    await getRecoveryStore().write({
      id: 'copy',
      documentName: 'Copy',
      figBytes: new Uint8Array([1])
    })
    const count = tabCount()
    const restored = await settleTabs(restoreRecoverySnapshot('copy'))
    expect(restored).not.toBe(tab.store)
    expect(tabCount()).toBe(count + 1)
    expect(tab.store.getDraftId()).toBe('kept')
  })
})
