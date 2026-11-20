import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'

import { createConversationHistory } from '@/app/ai/chat/history/controller'
import { createConversationStore } from '@/app/ai/chat/history/idb'
import type { HistoryChat } from '@/app/ai/chat/history/types'
import { agentChatDocument, startAgentRun } from '@/app/ai/reply/run'
import { createEditorStore } from '@/app/editor/session/create'

test('deleting a chat forgets its agent', async () => {
  const editor = createEditorStore()
  const chat: HistoryChat = { messages: [], status: 'ready', stop: async () => undefined }
  const runtime = {
    getEditor: () => ({
      state: { documentName: 'Doc' },
      getSourceIdentity: () => ({ handle: null }),
      getStorageBinding: () => null,
      getDocumentFilePath: () => null,
      getRecoveryId: () => null
    }),
    ensureChat: async () => chat,
    resumeChat: () => null,
    resetChat: async () => undefined,
    isDocumentOpen: () => true,
    backend: () => 'direct' as const,
    profileId: () => null,
    restoreProfile: () => undefined,
    profileBackend: () => null
  }
  const history = createConversationHistory(runtime, createConversationStore())
  try {
    startAgentRun(editor, 'chat-1')
    expect(agentChatDocument('chat-1')).toBe(editor)
    await history.remove('chat-1')
    expect(agentChatDocument('chat-1')).toBeUndefined()
  } finally {
    editor.dispose()
  }
})
