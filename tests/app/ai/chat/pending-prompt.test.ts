import { afterEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { SceneGraph } from '@open-pencil/scene-graph'

import { chatColumnOpen } from '@/app/ai/chat/panel'
import {
  hasPendingPrompt,
  promptSubmission,
  sendPromptToDocument,
  setPendingPrompt,
  takePendingPrompt
} from '@/app/ai/chat/pending-prompt'
import type { EditorStore } from '@/app/editor/active-store'
import { appPreferences } from '@/app/settings/preferences/store'

import { asDouble } from '#tests/helpers/doubles'

const savedPreferences = structuredClone(toRaw(appPreferences.value))
afterEach(() => {
  appPreferences.value = structuredClone(savedPreferences)
})

function documentStore(graph = new SceneGraph()): EditorStore {
  return asDouble<EditorStore>({
    graph,
    state: { activeRibbonTab: 'panels', mobileDrawerSnap: 'closed' }
  })
}

test("a document's prompt is taken once, by that document's chat only", () => {
  const first = documentStore()
  const second = documentStore()
  setPendingPrompt(first, promptSubmission('A pricing page'))

  expect(hasPendingPrompt(first)).toBe(true)
  expect(hasPendingPrompt(second)).toBe(false)
  expect(takePendingPrompt(second)).toBeNull()

  expect(takePendingPrompt(first)).toEqual({
    modelText: 'A pricing page',
    displayText: 'A pricing page',
    images: [],
    nodes: []
  })
  expect(hasPendingPrompt(first)).toBe(false)
  expect(takePendingPrompt(first)).toBeNull()
})

test('a newer prompt for the same document replaces the one still waiting', () => {
  const store = documentStore()
  setPendingPrompt(store, promptSubmission('First'))
  setPendingPrompt(store, promptSubmission('Second'))

  expect(takePendingPrompt(store)?.modelText).toBe('Second')
  expect(takePendingPrompt(store)).toBeNull()
})

test('sending a prompt to a document leaves it for that chat and shows the chat on any screen', () => {
  chatColumnOpen.value = false
  const store = documentStore()
  sendPromptToDocument(store, 'A sign-in screen')

  expect(hasPendingPrompt(store)).toBe(true)
  expect(chatColumnOpen.value).toBe(true)
  // A phone shows the chat in the drawer's AI tab, opened halfway.
  expect(store.state.activeRibbonTab).toBe('ai')
  expect(store.state.mobileDrawerSnap).toBe('half')
})

test('a prompt sent to a document carries the layers it references, as from the composer', () => {
  const graph = new SceneGraph()
  const hero = graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Hero' })
  const store = documentStore(graph)
  const text = `Make [Hero](openpencil://node/${encodeURIComponent(hero.id)}) taller, and [Gone](openpencil://node/0:404) too`
  sendPromptToDocument(store, text)

  const prompt = takePendingPrompt(store)
  expect(prompt?.modelText).toBe(text)
  expect(prompt?.displayText).toBe(text)
  // Only layers the document still has go with it.
  expect(prompt?.nodes).toEqual([{ id: hero.id, name: 'Hero', type: 'FRAME' }])
})
