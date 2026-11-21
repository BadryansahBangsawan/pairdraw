import { describe, expect, test } from 'bun:test'

import type { ChatTransport, UIMessage } from 'ai'
import { computed, ref } from 'vue'

import type { AIProviderID } from '@pairdraw/core/constants'

import { createChatSessionManager } from '@/app/ai/chat/session'
import { createEditorStore } from '@/app/editor/session/create'

const idleTransport: ChatTransport<UIMessage> = {
  sendMessages: async () => new ReadableStream(),
  reconnectToStream: async () => null
}

describe('chat transport', () => {
  test('a model change while the transport loads rebuilds the chat', async () => {
    const store = createEditorStore()
    const session = createChatSessionManager({
      isConfigured: computed(() => true),
      isACPProvider: computed(() => false),
      isHarnessProvider: computed(() => false),
      providerID: ref<AIProviderID>('openrouter'),
      credentialsReady: Promise.resolve(),
      getActiveEditorStore: () => store
    })
    let builds = 0
    session.setOverrideTransport(() => {
      builds++
      if (builds === 1) session.markTransportDirty()
      return idleTransport
    })

    const conversation = crypto.randomUUID()
    const stale = await session.ensureChat(undefined, conversation)
    const rebuilt = await session.ensureChat(undefined, conversation)

    expect(rebuilt).not.toBe(stale)
    expect(await session.ensureChat(undefined, conversation)).toBe(rebuilt)
    expect(builds).toBe(2)
  })
})
