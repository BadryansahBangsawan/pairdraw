import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { createDocumentGraph } from '@open-pencil/core'

import { chatColumnOpen } from '@/app/ai/chat/panel'
import { hasPendingStyleKit, offerStyleKit, takePendingStyleKit } from '@/app/ai/chat/pins/pending'
import type { StyleKit } from '@/app/ai/chat/pins/types'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

const savedPreferences = structuredClone(toRaw(appPreferences.value))
const stores: ReturnType<typeof createEditorStore>[] = []
afterEach(() => {
  appPreferences.value = structuredClone(savedPreferences)
  for (const store of stores.splice(0)) store.dispose()
})

function document() {
  const store = createEditorStore(createDocumentGraph('design'))
  stores.push(store)
  return store
}

const KIT: StyleKit = {
  name: 'Brand',
  colors: [{ name: 'Accent', hex: '#FF5B2EFF' }],
  fonts: ['Inter'],
  notes: 'Quiet.'
}

test('an offered kit waits for its own document, shows the chat, and is taken once', () => {
  chatColumnOpen.value = false
  const store = document()
  const other = document()

  offerStyleKit(store, KIT)
  expect(chatColumnOpen.value).toBe(true)
  expect(hasPendingStyleKit(store)).toBe(true)
  expect(hasPendingStyleKit(other)).toBe(false)

  const taken = takePendingStyleKit(store)
  expect(taken).toEqual(KIT)
  // The chat pins its own copy, so editing the pinned kit never reaches the one offered.
  expect(taken).not.toBe(KIT)
  expect(hasPendingStyleKit(store)).toBe(false)
  expect(takePendingStyleKit(store)).toBeNull()
})

test('a later kit replaces one still waiting', () => {
  const store = document()
  offerStyleKit(store, KIT)
  offerStyleKit(store, { ...KIT, name: 'Second' })
  expect(takePendingStyleKit(store)?.name).toBe('Second')
})
