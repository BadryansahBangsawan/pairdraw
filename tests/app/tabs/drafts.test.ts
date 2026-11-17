import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import { createDocumentGraph } from '@pairdraw/core'
import * as figModule from '@pairdraw/core/io/formats/fig'
import * as layoutModule from '@pairdraw/core/layout'
import { SceneGraph } from '@pairdraw/scene-graph'

import { answerClosePrompt, closePrompt } from '@/app/document/close/prompt'
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
  getActiveTabId,
  getTabById,
  getTabForStore,
  getTabsSnapshot,
  openNewFileTab,
  prepareForClose,
  restoreRecoverySnapshot,
  tabCount
} from '@/app/tabs'
import { deleteDraftEverywhere, openDraftInTab, saveDraftAs } from '@/app/tabs/open/draft'

import { clearTabGlobals, settleTabs, setupTabGlobals } from '#tests/helpers/tabs/globals'

const exportFigFile = figModule.exportFigFile

async function keepDraft(id: string): Promise<void> {
  const figBytes = await exportFigFile(createDocumentGraph('design'), { documentName: 'Kept' })
  await writeDraft({ id, name: 'Kept', figBytes })
}

function homeTab() {
  const home = getTabsSnapshot().find((tab) => tab.kind === 'home')
  if (!home) throw new Error('Home is missing')
  return home
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

  test('deleting a draft also drops a recovery copy kept beside it', async () => {
    await keepDraft('kept')
    const tab = draftTab('kept')
    tab.store.createShape('RECTANGLE', 0, 0, 10, 10)
    const recoveryId = tab.store.getRecoveryId()
    await getRecoveryStore().write({
      id: recoveryId,
      documentName: tab.store.state.documentName,
      figBytes: new Uint8Array([1])
    })

    await deleteDraftEverywhere('kept')

    expect(getTabById(tab.id)).toBeUndefined()
    expect(await getRecoveryStore().read(recoveryId)).toBeNull()
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

  test('opening a draft Home is holding shows that same document', async () => {
    await keepDraft('home-held')
    const home = getTabsSnapshot().find((tab) => tab.kind === 'home')
    if (!home) throw new Error('Home is missing')
    home.store.adoptDraft('home-held')
    const count = tabCount()

    const opened = await openDraftInTab('home-held')

    const shown = getTabForStore(opened)
    expect(opened).toBe(home.store)
    expect(shown?.kind).toBe('document')
    expect(shown?.id).toBe(home.id)
    expect(getActiveTabId()).toBe(home.id)
    expect(getTabsSnapshot().some((tab) => tab.kind === 'home')).toBe(true)
    expect(tabCount()).toBe(count + 1)
    expect(await readDraft('home-held')).not.toBeNull()

    expect(await openDraftInTab('home-held')).toBe(opened)
    expect(tabCount()).toBe(count + 1)
  })

  test('opening a draft a New file tab is holding shows that tab as the document', async () => {
    await keepDraft('new-file-held')
    const tab = openNewFileTab()
    tab.store.adoptDraft('new-file-held')
    const count = tabCount()

    const opened = await openDraftInTab('new-file-held')

    expect(opened).toBe(tab.store)
    expect(getTabForStore(opened)?.kind).toBe('document')
    expect(getActiveTabId()).toBe(tab.id)
    expect(tabCount()).toBe(count)
    expect(await readDraft('new-file-held')).not.toBeNull()
  })

  test('saving a draft Home is holding shows that document', async () => {
    await keepDraft('home-held')
    const home = homeTab()
    home.store.adoptDraft('home-held')
    vi.spyOn(home.store, 'saveFigFileAs').mockResolvedValue(true)

    const saved = await saveDraftAs('home-held', 'Kept')

    const shown = getTabForStore(home.store)
    if (!shown) throw new Error('The draft has no tab')
    expect(saved.status).toBe('saved')
    expect(shown.kind).toBe('document')
    expect(getActiveTabId()).toBe(shown.id)
    expect(getTabsSnapshot().some((tab) => tab.kind === 'home' && tab.store !== home.store)).toBe(
      true
    )
  })

  test('deleting a draft Home is holding drops it from Home', async () => {
    await keepDraft('home-held')
    const home = homeTab()
    home.store.adoptDraft('home-held')
    const node = home.store.createShape('RECTANGLE', 0, 0, 10, 10)

    await deleteDraftEverywhere('home-held')

    const front = homeTab()
    expect(await readDraft('home-held')).toBeNull()
    expect(front.store).not.toBe(home.store)
    expect(front.store.graph.getNode(node)).toBeUndefined()
    expect(getTabsSnapshot().some((tab) => tab.store === home.store)).toBe(false)
  })

  test('quitting asks about unsaved work Home is holding', async () => {
    for (const tab of getTabsSnapshot()) {
      if (tab.kind !== 'home') await closeTab(tab.id, 'discard')
    }
    const home = homeTab()
    home.store.createShape('RECTANGLE', 0, 0, 10, 10)
    const pending = prepareForClose()
    for (let attempt = 0; attempt < 20 && closePrompt.value === null; attempt += 1) {
      await Promise.resolve()
    }
    expect(closePrompt.value).not.toBeNull()
    answerClosePrompt('discard')
    expect(await pending).toBe(true)
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
