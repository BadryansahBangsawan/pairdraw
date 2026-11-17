import { afterEach, describe, expect, test, vi } from 'bun:test'

import { reactive } from 'vue'

import { createDefaultEditorState, createEditor } from '@pairdraw/core'

import * as browserIO from '@/app/document/io/browser'
import * as saveTargets from '@/app/document/io/save/targets'
import {
  createDocumentSourceActions,
  createDocumentSourceState
} from '@/app/document/io/source/actions'
import { getRecoveryStore, resetRecoveryStoreForTests } from '@/app/document/recovery'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'

function createDownloadOnlyDocument() {
  const editor = createEditor()
  const state = reactive({
    ...createDefaultEditorState('page'),
    documentName: 'Untitled',
    autosaveEnabled: false,
    saveFailure: null
  })
  const source = createDocumentSourceState()
  let savedVersion = 0
  const actions = createDocumentSourceActions({
    editor,
    state,
    ...source,
    stopWatchingFile: vi.fn(),
    startWatchingFile: vi.fn(async () => undefined),
    getSavedVersion: () => savedVersion,
    setSavedVersion: (version) => {
      savedVersion = version
    },
    setLastWriteTime: vi.fn(),
    getRenderer: () => null
  })
  return { actions, source }
}

afterEach(() => {
  vi.restoreAllMocks()
  resetRecoveryStoreForTests()
})

describe('saving by download', () => {
  test('keeps the recovery copy, since the page cannot tell the download was kept', async () => {
    resetRecoveryStoreForTests(createMemoryRecoveryStore())
    // A browser without the File System Access API asks for a name and downloads the file.
    vi.spyOn(saveTargets, 'chooseBrowserFigSaveHandle').mockResolvedValue(null)
    const download = vi.spyOn(browserIO, 'downloadBlob').mockReturnValue(undefined)
    vi.spyOn(globalThis, 'prompt').mockReturnValue('Design.fig')
    const { actions, source } = createDownloadOnlyDocument()

    actions.markDocumentChanged()
    await actions.persistRecoveryNow()
    const recoveryId = actions.getRecoveryId()
    expect(await getRecoveryStore().read(recoveryId)).not.toBeNull()

    expect(await actions.saveFigFileAs()).toBe(true)
    expect(download).toHaveBeenCalledTimes(1)
    expect(source.getDownloadName()).toBe('Design.fig')
    // The person may have cancelled the browser's prompt: the work stays recoverable.
    expect(await getRecoveryStore().read(recoveryId)).not.toBeNull()

    expect(await actions.saveFigFile()).toBe(true)
    expect(download).toHaveBeenCalledTimes(2)
    expect(await getRecoveryStore().read(recoveryId)).not.toBeNull()
  })
})
