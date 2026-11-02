import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { createDocumentGraph } from '@open-pencil/core'

import { closeCanvasPrompt, offersCanvasPrompt } from '@/app/ai/chat/canvas-prompt'
import { promptSubmission, setPendingPrompt, takePendingPrompt } from '@/app/ai/chat/pending-prompt'
import { canvasPrompt } from '@/app/ai/chat/preferences'
import { createEditorStore } from '@/app/editor/session/create'
import { addAgent } from '@/app/presence/registry'
import { appPreferences } from '@/app/settings/preferences/store'

const savedPreferences = structuredClone(toRaw(appPreferences.value))
const stores: ReturnType<typeof createEditorStore>[] = []
beforeEach(() => {
  // The prompt is opt-in; these tests cover it turned on, and the last one turns it off again.
  canvasPrompt.value = true
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

test('an empty page of a design offers the prompt until its first layer exists', async () => {
  const store = emptyDocument()
  // No canvas presents frames here; treat every page switch as presented.
  store.preparationController.acknowledgePresentation(Number.MAX_SAFE_INTEGER)
  expect(offersCanvasPrompt(store)).toBe(true)

  store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'Card' })
  expect(offersCanvasPrompt(store)).toBe(false)

  // Another page that is still empty offers it again.
  await store.switchPage(store.graph.addPage('Empty').id)
  expect(offersCanvasPrompt(store)).toBe(true)
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

test('a fresh profile does not offer it until the preference is turned on', () => {
  appPreferences.value = structuredClone(savedPreferences)
  canvasPrompt.value = false
  expect(offersCanvasPrompt(emptyDocument())).toBe(false)
})
