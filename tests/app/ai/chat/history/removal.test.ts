import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import { createConversationStore } from '@/app/ai/chat/history/idb'
import type { Conversation } from '@/app/ai/chat/history/types'

function conversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    documentId: crypto.randomUUID(),
    documentName: 'Draft',
    title: '',
    titleSource: 'fallback',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    profileId: null,
    backend: 'direct',
    interrupted: false,
    messages: []
  }
}

describe('deleting a chat that was never saved', () => {
  test('does not leave a tombstone that blocks saving that id later', async () => {
    const store = createConversationStore()
    const row = conversation()
    await store.remove(row.id)
    await store.write(row)
    expect((await store.read(row.id))?.id).toBe(row.id)
  })
})
