import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'

import type { ChatStatus, UIMessage } from 'ai'
import { nextTick, reactive } from 'vue'

import { createConversationHistory } from '@/app/ai/chat/history/controller'
import type { ChatDocumentEditor } from '@/app/ai/chat/history/document'
import { createConversationStore } from '@/app/ai/chat/history/idb'
import { createDeferred } from '@/app/runtime/deferred'

import { expectDefined } from '#tests/helpers/assert'

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

function fixture(title?: (messages: UIMessage[]) => Promise<string | null>) {
  const activeEditor = editor()
  const store = createConversationStore()
  const chat = reactive({
    messages: [] as UIMessage[],
    status: 'ready' as ChatStatus,
    stop: async () => undefined
  })
  const history = createConversationHistory(
    {
      title,
      getEditor: () => activeEditor,
      ensureChat: async () => chat,
      resumeChat: () => null,
      resetChat: async () => undefined,
      isDocumentOpen: () => true,
      profileId: () => null,
      restoreProfile: () => undefined,
      profileBackend: () => 'direct',
      backend: () => 'direct'
    },
    store
  )
  return { history, chat, store }
}

/** One request and its reply, as the chat holds them once the reply is in. */
const exchange: UIMessage[] = [
  { id: 'ask', role: 'user', parts: [{ type: 'text', text: 'Make the cards the same height' }] },
  { id: 'reply', role: 'assistant', parts: [{ type: 'text', text: 'Done.' }] }
]

/** The chat takes a message and finishes its reply, as a turn does. */
async function reply(chat: { messages: UIMessage[]; status: ChatStatus }): Promise<void> {
  chat.status = 'streaming'
  await nextTick()
  chat.messages = exchange
  chat.status = 'ready'
  await nextTick()
}

/** Naming runs beside the chat; its answer and the serialized save are microtasks to drain. */
async function named(history: { current: { value: { titleSource: string } | null } }) {
  for (let turn = 0; turn < 50 && history.current.value?.titleSource !== 'generated'; turn++) {
    await Promise.resolve()
  }
}

test('a conversation is named once its first reply is in, and keeps the name', async () => {
  const asked: UIMessage[][] = []
  const f = fixture(async (messages) => {
    asked.push(messages)
    return 'Equal-height cards'
  })
  await f.history.ensureChat()
  const id = expectDefined(f.history.current.value?.id, 'a conversation')
  await reply(f.chat)
  await named(f.history)
  await f.history.flush()
  expect(asked).toHaveLength(1)
  expect(f.history.current.value).toMatchObject({
    title: 'Equal-height cards',
    titleSource: 'generated'
  })
  expect(await f.store.read(id)).toMatchObject({
    title: 'Equal-height cards',
    titleSource: 'generated'
  })

  await reply(f.chat)
  await f.history.flush()
  expect(asked).toHaveLength(1)
})

test('a name the person typed is not replaced by a generated one', async () => {
  const answer = createDeferred<string | null>()
  const f = fixture(() => answer.promise)
  await f.history.ensureChat()
  const id = expectDefined(f.history.current.value?.id, 'a conversation')
  await reply(f.chat)
  await f.history.rename(id, 'My own name')
  answer.resolve('Generated name')
  await f.history.flush()
  expect(f.history.current.value).toMatchObject({ title: 'My own name', titleSource: 'manual' })
})

test('a conversation keeps its first message as the title when none is generated', async () => {
  const f = fixture(async () => null)
  await f.history.ensureChat()
  await reply(f.chat)
  await f.history.flush()
  expect(f.history.current.value).toMatchObject({
    title: 'Make the cards the same height',
    titleSource: 'fallback'
  })
})

test('a reply stopped by starting another conversation does not name the one it leaves', async () => {
  const asked: UIMessage[][] = []
  const f = fixture(async (messages) => {
    asked.push(messages)
    return 'Equal-height cards'
  })
  await f.history.ensureChat()
  f.chat.stop = async () => {
    f.chat.status = 'ready'
    await nextTick()
  }
  f.chat.status = 'streaming'
  await nextTick()
  f.chat.messages = exchange
  await f.history.newChat()
  await f.history.flush()
  expect(asked).toEqual([])
})