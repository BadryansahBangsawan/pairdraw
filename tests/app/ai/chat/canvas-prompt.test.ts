import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { createDocumentGraph } from '@pairdraw/core'

import {
  closeCanvasPrompt,
  isShownPageEmpty,
  offersCanvasPrompt
} from '@/app/ai/chat/canvas-prompt'
import { chatColumnOpen } from '@/app/ai/chat/panel'
import { promptSubmission, setPendingPrompt, takePendingPrompt } from '@/app/ai/chat/pending-prompt'
import { canvasPrompt } from '@/app/ai/chat/preferences'
import { createEditorStore } from '@/app/editor/session/create'
import { addAgent } from '@/app/presence/registry'
import { appPreferences, DEFAULT_APP_PREFERENCES } from '@/app/settings/preferences/store'

const savedPreferences = structuredClone(toRaw(appPreferences.value))
const stores: ReturnType<typeof createEditorStore>[] = []
beforeEach(() => {
  canvasPrompt.value = true
  chatColumnOpen.value = false
})
afterEach(() => {
  appPreferences.value = structuredClone(savedPreferences)
  for (const store of stores.splice(0)) store.dispose()
})

function emptyDocument(kind: 'design' | 'board' = 'design') {
  const store = createEditorStore(createDocumentGraph(kind))
  stores.push(store)
  return store
}

test('a design offers the prompt while its chat column is closed, on empty and drawn pages', () => {
  const store = emptyDocument()
  // No canvas presents frames here; treat every page switch as presented.
  store.preparationController.acknowledgePresentation(Number.MAX_SAFE_INTEGER)
  expect(offersCanvasPrompt(store)).toBe(true)
  expect(isShownPageEmpty(store)).toBe(true)

  store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'Card' })
  expect(offersCanvasPrompt(store)).toBe(true)
  expect(isShownPageEmpty(store)).toBe(false)

  chatColumnOpen.value = true
  expect(offersCanvasPrompt(store)).toBe(false)
  chatColumnOpen.value = false
  expect(offersCanvasPrompt(store)).toBe(true)
})

test('another page that is still empty suggests what to ask for again', async () => {
  const store = emptyDocument()
  store.preparationController.acknowledgePresentation(Number.MAX_SAFE_INTEGER)
  store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'Card' })
  expect(isShownPageEmpty(store)).toBe(false)

  await store.switchPage(store.graph.addPage('Empty').id)
  expect(isShownPageEmpty(store)).toBe(true)
})

test('a working agent or a prompt on its way hides it', () => {
  const store = emptyDocument()
  const agent = addAgent(store, 'chat')
  agent.update({ status: 'thinking' })
  expect(offersCanvasPrompt(store)).toBe(false)
  agent.update({ status: 'idle' })
  expect(offersCanvasPrompt(store)).toBe(true)

  setPendingPrompt(store, promptSubmission('A dashboard'))
  expect(offersCanvasPrompt(store)).toBe(false)
  takePendingPrompt(store)
  expect(offersCanvasPrompt(store)).toBe(true)
})

test('closing it keeps it away from that document only', () => {
  const closed = emptyDocument()
  const other = emptyDocument()
  closeCanvasPrompt(closed)
  expect(offersCanvasPrompt(closed)).toBe(false)
  expect(offersCanvasPrompt(other)).toBe(true)
})

test('boards, read-only documents, and the preference turned off never offer it', () => {
  expect(offersCanvasPrompt(emptyDocument('board'))).toBe(false)

  const readOnly = emptyDocument()
  readOnly.state.hostRestrictions = { readOnly: true }
  expect(offersCanvasPrompt(readOnly)).toBe(false)

  const design = emptyDocument()
  canvasPrompt.value = false
  expect(offersCanvasPrompt(design)).toBe(false)
})

test('a fresh profile offers it', () => {
  appPreferences.value = structuredClone(DEFAULT_APP_PREFERENCES)
  expect(offersCanvasPrompt(emptyDocument())).toBe(true)
})
