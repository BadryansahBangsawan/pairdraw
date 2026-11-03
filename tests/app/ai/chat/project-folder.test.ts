import 'fake-indexeddb/auto'
import { afterEach, describe, expect, test } from 'bun:test'

import { reactive } from 'vue'

import { createConversationHistory } from '@/app/ai/chat/history/controller'
import { createConversationStore } from '@/app/ai/chat/history/idb'
import {
  chatProjectFolder,
  pickProjectFolder,
  projectFolderName,
  setChatProjectFolder
} from '@/app/ai/chat/project-folder'

import { expectDefined } from '#tests/helpers/assert'
import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  setChatProjectFolder('chat-a', null)
  setChatProjectFolder('chat-b', null)
  await clearTauriMocks()
})

describe('a chat’s project folder', () => {
  test('belongs to its conversation, on desktop', async () => {
    await mockTauriIPC(() => null)
    setChatProjectFolder('chat-a', '/Users/tester/code/shop')

    expect(chatProjectFolder('chat-a')).toBe('/Users/tester/code/shop')
    expect(chatProjectFolder('chat-b')).toBeNull()
    expect(chatProjectFolder(undefined)).toBeNull()

    setChatProjectFolder('chat-a', null)
    expect(chatProjectFolder('chat-a')).toBeNull()
  })

  test('is ignored outside the desktop app, where the companion keeps its own workspace', async () => {
    await mockTauriIPC(() => null)
    setChatProjectFolder('chat-a', '/Users/tester/code/shop')
    await clearTauriMocks()

    expect(chatProjectFolder('chat-a')).toBeNull()
    expect(await pickProjectFolder()).toBeNull()
  })

  test('is picked through the system folder dialog', async () => {
    const requests: unknown[] = []
    await mockTauriIPC((cmd, args) => {
      if (cmd === 'plugin:dialog|open') {
        requests.push(args)
        return '/Users/tester/code/shop'
      }
      return null
    })

    expect(await pickProjectFolder()).toBe('/Users/tester/code/shop')
    expect(requests).toEqual([
      expect.objectContaining({ options: expect.objectContaining({ directory: true }) })
    ])
  })

  test('shows by its own name on every platform', () => {
    expect(projectFolderName('/Users/tester/code/shop/')).toBe('shop')
    expect(projectFolderName('C:\\Users\\tester\\shop')).toBe('shop')
    expect(projectFolderName('/')).toBe('/')
  })

  test('is forgotten with its conversation, leaving no path to the project behind', async () => {
    await mockTauriIPC(() => null)
    const recoveryId = crypto.randomUUID()
    const chat = reactive({ messages: [], status: 'ready' as const, stop: async () => undefined })
    const history = createConversationHistory(
      {
        getEditor: () => ({
          state: { documentName: 'Test document' },
          getRecoveryId: () => recoveryId,
          getSourceIdentity: () => ({ path: null, handle: null }),
          getDocumentFilePath: () => null,
          getStorageBinding: () => null
        }),
        ensureChat: async () => chat,
        resetChat: async () => undefined,
        profileId: () => null,
        restoreProfile: () => undefined,
        profileBackend: () => 'acp',
        backend: () => 'acp'
      },
      createConversationStore()
    )
    await history.initialize()
    const id = expectDefined(history.current.value, 'conversation').id
    setChatProjectFolder(id, '/Users/tester/code/shop')

    await history.remove(id)

    expect(chatProjectFolder(id)).toBeNull()
  })
})
