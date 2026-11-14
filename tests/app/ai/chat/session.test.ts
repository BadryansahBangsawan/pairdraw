import 'fake-indexeddb/auto'
import { afterEach, describe, expect, test } from 'bun:test'

import { computed, ref } from 'vue'

import type { AIProviderID } from '@pairdraw/core/constants'

import { setChatProjectFolder } from '@/app/ai/chat/project-folder'
import { createChatSessionManager } from '@/app/ai/chat/session'
import type { ACPChatTransport } from '@/app/ai/transports/acp'
import type { EditorStore } from '@/app/editor/active-store'

import { asDouble } from '#tests/helpers/doubles'
import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

/** Conversation ids, which are UUIDs. */
const chatA = crypto.randomUUID()
const chatB = crypto.randomUUID()

afterEach(async () => {
  setChatProjectFolder(chatA, null)
  setChatProjectFolder(chatB, null)
  await clearTauriMocks()
})

/** A coding agent's chat on desktop whose agent sessions are recorded instead of started. */
function agentChat() {
  const started: (string | null)[] = []
  let destroyed = 0
  const editor = asDouble<EditorStore>({})
  const manager = createChatSessionManager({
    isConfigured: computed(() => true),
    isACPProvider: computed(() => true),
    isHarnessProvider: computed(() => false),
    providerID: ref<AIProviderID>('acp:claude-code'),
    credentialsReady: Promise.resolve(),
    getActiveEditorStore: () => editor,
    agents: {
      ready: async () => undefined,
      createACPTransport: async (_provider, _store, _onUsage, projectFolder) => {
        started.push(projectFolder ?? null)
        return asDouble<ACPChatTransport>({
          destroy: async () => {
            destroyed++
          }
        })
      }
    }
  })
  return { manager, started, destroyed: () => destroyed }
}

describe('a coding agent’s chat and its project folder', () => {
  test('starts the agent again in the folder chosen or cleared since, and only then', async () => {
    await mockTauriIPC(() => null)
    const { manager, started, destroyed } = agentChat()

    const first = await manager.ensureChat([], chatA)
    expect(await manager.ensureChat(undefined, chatA)).toBe(first)
    expect(started).toEqual([null])

    setChatProjectFolder(chatA, '/Users/tester/code/shop')
    const inFolder = await manager.ensureChat(undefined, chatA)
    expect(inFolder).not.toBe(first)
    expect(started).toEqual([null, '/Users/tester/code/shop'])
    expect(destroyed()).toBe(1)

    // Sending again keeps the session that already works in the folder.
    expect(await manager.ensureChat(undefined, chatA)).toBe(inFolder)
    expect(started).toHaveLength(2)

    setChatProjectFolder(chatA, null)
    await manager.ensureChat(undefined, chatA)
    expect(started).toEqual([null, '/Users/tester/code/shop', null])
    expect(destroyed()).toBe(2)
  })

  test('a folder belongs to its own conversation only', async () => {
    await mockTauriIPC(() => null)
    const { manager, started } = agentChat()
    setChatProjectFolder(chatA, '/Users/tester/code/shop')

    await manager.ensureChat([], chatB)
    await manager.ensureChat(undefined, chatB)

    expect(started).toEqual([null])
  })
})
