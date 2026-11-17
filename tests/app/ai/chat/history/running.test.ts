import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import type { UIMessage } from 'ai'
import { nextTick, reactive } from 'vue'

import { createConversationHistory } from '@/app/ai/chat/history/controller'
import type { ChatDocumentEditor } from '@/app/ai/chat/history/document'
import { createConversationStore } from '@/app/ai/chat/history/idb'

function editor(path: () => string | null = () => null): ChatDocumentEditor {
  const id = crypto.randomUUID()
  return {
    state: { documentName: 'Test document' },
    getRecoveryId: () => id,
    getSourceIdentity: () => ({ path: path(), handle: null }),
    getDocumentFilePath: path,
    getStorageBinding: () => null
  }
}

type RunningChat = {
  messages: UIMessage[]
  status: 'ready' | 'submitted' | 'streaming'
  stop: () => Promise<void>
}

function fixture() {
  let firstPath: string | null = null
  const first = editor(() => firstPath)
  const second = editor()
  let active = first
  let started = 0
  let stops = 0
  let resets = 0
  const open = new Set<ChatDocumentEditor>([first, second])
  const live: {
    chat: RunningChat | null
    sessionId: string | null
    editor: ChatDocumentEditor | null
  } = { chat: null, sessionId: null, editor: null }
  const chat = reactiveChat(() => stops++)
  const history = createConversationHistory(
    {
      getEditor: () => active,
      ensureChat: async (_messages, sessionId) => {
        if (live.chat && live.sessionId === sessionId && live.editor === active) return live.chat
        started++
        live.chat = chat
        live.sessionId = sessionId ?? null
        live.editor = active
        return chat
      },
      resumeChat: (sessionId) =>
        live.chat && live.sessionId === sessionId && live.editor === active ? live.chat : null,
      resetChat: async () => {
        resets++
        live.chat = null
      },
      isDocumentOpen: (editor) => open.has(editor),
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
    first,
    second,
    started: () => started,
    stops: () => stops,
    resets: () => resets,
    close: (editor: ChatDocumentEditor) => open.delete(editor),
    saveFirstAs: (path: string) => {
      firstPath = path
    },
    switchTo: (next: ChatDocumentEditor) => {
      active = next
    }
  }
}

function reactiveChat(onStop: () => void): RunningChat {
  return reactive({
    messages: [] as UIMessage[],
    status: 'ready' as RunningChat['status'],
    stop: async () => {
      onStop()
    }
  })
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

  test('a running reply survives the active document changing', async () => {
    const f = fixture()
    await f.history.initialize()
    await f.history.ensureChat()
    const conversation = f.history.current.value
    f.chat.status = 'streaming'

    f.switchTo(f.second)
    await f.history.initialize()

    expect(f.stops()).toBe(0)
    expect(f.resets()).toBe(0)
    expect(f.history.current.value?.id).toBe(conversation?.id)
    expect(f.history.away.value).toBe(true)
    // The panel keeps showing the reply running in the other document.
    expect(f.history.liveChat()).toBe(f.chat)
    expect(f.history.readOnly.value).toBe(false)
  })

  test('returning to the document reuses the running chat instead of starting one', async () => {
    const f = fixture()
    await f.history.initialize()
    await f.history.ensureChat()
    const conversation = f.history.current.value
    f.chat.status = 'streaming'
    f.switchTo(f.second)
    await f.history.initialize()

    f.switchTo(f.first)
    await f.history.initialize()

    expect(f.history.away.value).toBe(false)
    expect(f.history.current.value?.id).toBe(conversation?.id)
    expect(f.history.readOnly.value).toBe(false)
    expect(f.history.liveChat()).toBe(f.chat)
    expect(await f.history.ensureChat()).toBe(f.chat)
    expect(f.started()).toBe(1)
    expect(f.resets()).toBe(0)
  })

  test('a reply that ends while another document shows hands the panel back to it', async () => {
    const f = fixture()
    await f.history.initialize()
    await f.history.ensureChat()
    f.chat.messages = [{ id: 'reply', role: 'assistant', parts: [{ type: 'text', text: 'Hi' }] }]
    f.chat.status = 'streaming'
    f.switchTo(f.second)
    await f.history.initialize()

    f.chat.status = 'ready'
    await nextTick()
    await f.history.initialize()

    expect(f.history.away.value).toBe(false)
    expect(f.history.current.value?.documentId).toBe(`recovery:${f.second.getRecoveryId()}`)
    expect(f.history.liveChat()).toBeNull()
    expect(f.stops()).toBe(0)
    expect(f.resets()).toBe(0)

    // The finished conversation still resumes without starting an agent again.
    f.switchTo(f.first)
    await f.history.initialize()
    expect(f.history.liveChat()).toBe(f.chat)
    expect(f.started()).toBe(1)
  })

  test('closing the running conversation’s document stops the reply', async () => {
    const f = fixture()
    await f.history.initialize()
    await f.history.ensureChat()
    f.chat.status = 'streaming'
    f.switchTo(f.second)
    await f.history.initialize()

    f.close(f.first)
    await f.history.initialize()

    expect(f.stops()).toBe(1)
    expect(f.resets()).toBe(1)
    expect(f.history.away.value).toBe(false)
    expect(f.history.current.value?.documentId).toBe(`recovery:${f.second.getRecoveryId()}`)
  })

  test('saving the running document under a new path keeps its reply in front', async () => {
    const f = fixture()
    await f.history.initialize()
    await f.history.ensureChat()
    const conversation = f.history.current.value
    f.chat.messages = [{ id: 'ask', role: 'user', parts: [{ type: 'text', text: 'Draw' }] }]
    await f.history.flush()
    f.chat.status = 'streaming'

    f.saveFirstAs('/designs/saved.fig')
    await f.history.initialize()

    expect(f.history.current.value?.id).toBe(conversation?.id)
    expect(f.history.current.value?.documentId).toBe('file:/designs/saved.fig')
    expect(f.history.away.value).toBe(false)
    expect(f.history.liveChat()).toBe(f.chat)
    expect(f.stops()).toBe(0)
  })
})
