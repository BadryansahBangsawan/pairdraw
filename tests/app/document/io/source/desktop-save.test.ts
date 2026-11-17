import { afterEach, describe, expect, test, vi } from 'bun:test'

import { reactive } from 'vue'

import { createDefaultEditorState, createEditor } from '@pairdraw/core'

import {
  createDocumentSourceActions,
  createDocumentSourceState
} from '@/app/document/io/source/actions'
import { getRecoveryStore, resetRecoveryStoreForTests } from '@/app/document/recovery'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import type { SaveFailure } from '@/app/document/save-failure'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

function noSaveFailure(): SaveFailure | null {
  return null
}

function createDesktopDocument(startWatchingFile: () => Promise<void>) {
  const editor = createEditor()
  const state = reactive({
    ...createDefaultEditorState('page'),
    documentName: 'Document',
    autosaveEnabled: false,
    saveFailure: noSaveFailure()
  })
  const source = createDocumentSourceState()
  const actions = createDocumentSourceActions({
    editor,
    state,
    ...source,
    stopWatchingFile: vi.fn(),
    startWatchingFile,
    getRenderer: () => null
  })
  source.setFilePath('/tmp/document.fig')
  return { actions, state }
}

afterEach(async () => {
  await clearTauriMocks()
  resetRecoveryStoreForTests()
  vi.restoreAllMocks()
})

describe('saving a desktop document', () => {
  test('starts the file watch again after the file is replaced', async () => {
    resetRecoveryStoreForTests(createMemoryRecoveryStore())
    await mockTauriIPC((cmd) => {
      expect(cmd).toBe('write_document_file')
      return null
    })
    const startWatchingFile = vi.fn(async () => undefined)
    const { actions, state } = createDesktopDocument(startWatchingFile)
    state.saveFailure = { error: 'disk full' }

    actions.markDocumentChanged()
    expect(await actions.saveFigFile()).toBe(true)

    expect(state.saveFailure).toBeNull()
    expect(actions.hasUnsavedChanges()).toBe(false)
    expect(startWatchingFile).toHaveBeenCalledTimes(1)
  })

  test('keeps the unsaved document and its recovery copy when the write fails', async () => {
    resetRecoveryStoreForTests(createMemoryRecoveryStore())
    await mockTauriIPC(() => {
      throw new Error('disk full')
    })
    const startWatchingFile = vi.fn(async () => undefined)
    const { actions, state } = createDesktopDocument(startWatchingFile)
    state.saveFailure = { error: 'disk full' }

    actions.markDocumentChanged()
    await actions.persistRecoveryNow()
    const recoveryId = actions.getRecoveryId()
    expect(await getRecoveryStore().read(recoveryId)).not.toBeNull()

    await expect(actions.saveFigFile()).rejects.toThrow('disk full')
    expect(state.saveFailure).toEqual({ error: 'disk full' })
    expect(actions.hasUnsavedChanges()).toBe(true)
    expect(await getRecoveryStore().read(recoveryId)).not.toBeNull()
    expect(startWatchingFile).not.toHaveBeenCalled()
  })
})
