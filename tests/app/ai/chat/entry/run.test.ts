import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { createDocumentGraph } from '@open-pencil/core'

import { acceptsDocumentPrompts } from '@/app/ai/chat/entry/run'
import { createEditorStore } from '@/app/editor/session/create'

const stores: ReturnType<typeof createEditorStore>[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

function openDocument() {
  const store = createEditorStore(createDocumentGraph('design'))
  stores.push(store)
  return store
}

test('a document open for edits takes prompts from sticky notes and comments', () => {
  expect(acceptsDocumentPrompts(openDocument())).toBe(true)
})

test('a read-only document takes none, since the agent would edit it', () => {
  const store = openDocument()
  store.setReadOnly(true)
  expect(acceptsDocumentPrompts(store)).toBe(false)
  store.setReadOnly(false)
  expect(acceptsDocumentPrompts(store)).toBe(true)
})
