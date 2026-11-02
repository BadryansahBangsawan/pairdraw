import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import type { UIMessage } from 'ai'
import { nextTick, reactive, ref } from 'vue'

import type { ChatBackend } from '@/app/ai/chat/history/backend'
import { createConversationHistory } from '@/app/ai/chat/history/controller'
import type { ChatDocumentEditor } from '@/app/ai/chat/history/document'
import { createConversationStore } from '@/app/ai/chat/history/idb'

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

/** What each model profile runs on: `built-in` and `fast` are built-in models, `agent` an ACP agent. */
const backends: Record<string, ChatBackend> = { 'built-in': 'direct', fast: 'direct', agent: 'acp' }

/** A chat history whose model profile is a ref, as the app's model settings are. */
function fixture(profiles: readonly string[] = ['built-in', 'fast', 'agent']) {
  const active = editor()
  const profile = ref<string | null>(profiles[0] ?? null)
  const store = createConversationStore()
  const chat = reactive({
    messages: [] as UIMessage[],
    status: 'ready' as const,
    stop: async () => undefined
  })
  const history = createConversationHistory(
    {
      getEditor: () => active,
      ensureChat: async () => chat,
      resetChat: async () => undefined,
      profileId: () => profile.value,
      restoreProfile: (id) => {
        if (profiles.includes(id)) profile.value = id
      },
      profileBackend: (id) => (profiles.includes(id) ? (backends[id] ?? null) : null),
      backend: () => (profile.value ? (backends[profile.value] ?? 'direct') : 'direct')
    },
    store
  )
  return { history, store, chat, profile }
}

async function sendMessage(f: ReturnType<typeof fixture>, text: string) {
  await f.history.ensureChat()
  f.chat.messages = [
    ...f.chat.messages,
    { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] }
  ]
  // Lets the session's own save of the change run first, so no write lands after this one.
  await nextTick()
  await f.history.flush()
}

/** The profile the store holds for a conversation once its pending writes have landed. */
async function savedProfile(f: ReturnType<typeof fixture>, id: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const saved = await f.store.read(id)
    if (saved?.profileId !== f.history.current.value?.profileId) {
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
      continue
    }
    return saved?.profileId
  }
  return (await f.store.read(id))?.profileId
}

describe('model profile per conversation', () => {
  test('reopening a conversation selects the model it last used', async () => {
    const f = fixture()
    await sendMessage(f, 'Draw a card')
    const first = expectDefined(f.history.current.value, 'first conversation').id
    await f.history.newChat()
    f.profile.value = 'fast'
    await sendMessage(f, 'Review the page')

    await f.history.open(first)
    expect(f.profile.value).toBe('built-in')
  })

  test('remembers a switch made without sending anything after it', async () => {
    const f = fixture()
    await sendMessage(f, 'Draw a card')
    const first = expectDefined(f.history.current.value, 'first conversation').id
    const before = expectDefined(await f.store.read(first), 'saved conversation').updatedAt
    f.profile.value = 'fast'
    await nextTick()

    // Saved without a flush or a switch of conversation, as before the app is closed.
    expect(await savedProfile(f, first)).toBe('fast')
    // A switch is not activity: the conversation keeps its place in the history.
    expect((await f.store.read(first))?.updatedAt).toBe(before)
  })

  test('opening an agent conversation does not switch the model for the next chat', async () => {
    const f = fixture()
    f.profile.value = 'agent'
    await nextTick()
    await f.history.newChat()
    await sendMessage(f, 'Review the page')
    const agentChat = expectDefined(f.history.current.value, 'agent conversation')
    expect(agentChat.backend).toBe('acp')
    await f.history.newChat()
    f.profile.value = 'built-in'
    await nextTick()

    await f.history.open(agentChat.id)
    expect(f.profile.value).toBe('built-in')
  })

  test('a conversation that ended on an agent stays on a built-in model it can continue', async () => {
    const f = fixture()
    await sendMessage(f, 'Draw a card')
    const first = expectDefined(f.history.current.value, 'first conversation').id
    f.profile.value = 'agent'
    await nextTick()
    expect(await savedProfile(f, first)).toBe('agent')
    await f.history.newChat()
    f.profile.value = 'built-in'
    await nextTick()

    await f.history.open(first)
    expect(f.profile.value).toBe('built-in')
    expect(await f.history.ensureChat()).not.toBeNull()
  })

  test('keeps the current model when the one a conversation used is gone', async () => {
    const f = fixture()
    await sendMessage(f, 'Draw a card')
    const id = expectDefined(f.history.current.value, 'first conversation').id
    await f.history.newChat()
    const first = expectDefined(await f.store.read(id), 'saved conversation')
    await f.store.write({ ...first, profileId: 'deleted' })
    f.profile.value = 'agent'

    await f.history.open(first.id)
    expect(f.profile.value).toBe('agent')
  })
})
