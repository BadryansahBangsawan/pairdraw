import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import type { UIMessage } from 'ai'
import { reactive } from 'vue'

import { createConversationHistory } from '@/app/ai/chat/history/controller'
import type { ChatDocumentEditor } from '@/app/ai/chat/history/document'
import { createConversationStore } from '@/app/ai/chat/history/idb'

function editor(): ChatDocumentEditor {
  const id = crypto.randomUUID()
  return {
    state: { documentName: 'Test document' },
    getRecoveryId: () => id,
    getSourceIdentity: () => ({ path: null, handle: null }),
    getDocumentFilePath: () => null,
    getStorageBinding: () => null
  }
}

function fixture() {
  let active = editor()
  let started = 0
  const chat = reactive({
    messages: [] as UIMessage[],
    status: 'ready' as 'ready' | 'submitted' | 'streaming',
    stop: async () => undefined
  })
  const history = createConversationHistory(
    {
      getEditor: () => active,
      ensureChat: async () => {
        started++
        return chat
      },
      resetChat: async () => undefined,
      profileId: () => null,
      restoreProfile: () => undefined,
      profileBackend: () => 'direct',
      backend: () => 'direct'
    },
    createConversationStore()
  )
  return {
    history,
    chat,
    started: () => started,
    switchTo: (next: ChatDocumentEditor) => {
      active = next
    }
  }
}

describe('running chat', () => {
  test('a chat view shown again takes up the reply still running without starting a chat', async () => {
    const f = fixture()
    await f.history.initialize()
    await f.history.ensureChat()
    f.chat.status = 'streaming'

    // The chat view left and shows the same document again.
    await f.history.initialize()

    expect(f.history.runningChat()).toBe(f.chat)
    expect(f.started()).toBe(1)
  })

  test('no chat is taken up once the reply ends or before one ran', async () => {
    const f = fixture()
    await f.history.initialize()
    expect(f.history.runningChat()).toBeNull()

    await f.history.ensureChat()
    expect(f.history.runningChat()).toBeNull()
    expect(f.started()).toBe(1)
  })

  test('another document does not take up the reply', async () => {
    const f = fixture()
    await f.history.initialize()
    await f.history.ensureChat()
    f.chat.status = 'streaming'

    f.switchTo(editor())

    expect(f.history.runningChat()).toBeNull()
  })
})
