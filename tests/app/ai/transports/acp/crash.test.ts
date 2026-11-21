/**
 * A coding agent that exits mid-reply ends the reply with an error, as one that answers does.
 * The SDK leaves session/prompt pending when the connection closes, so without this the chat
 * waits forever, its run stays active, and the design check stays held.
 */
import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { AgentSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'

import { ACP_AGENTS } from '@pairdraw/core/constants'

import type { AgentHost } from '@/app/ai/agents/host/types'
import { agentChatDocument, currentRun } from '@/app/ai/reply/run'
import { ACPChatTransport } from '@/app/ai/transports/acp'
import { createEditorStore } from '@/app/editor/session/create'

const agentDef = ACP_AGENTS[0]
if (!agentDef) throw new Error('No ACP agent to start')

type EditorStore = ReturnType<typeof createEditorStore>

let store: EditorStore
afterEach(() => {
  store.dispose()
})

/**
 * A host whose agent starts a session and then exits without answering the prompt: its output
 * ends and onExit fires, as a crashed process does. `chat` reads the id the session carries.
 */
function crashingHost(): { host: AgentHost; chat: () => string | null } {
  let chat: string | null = null
  const host: AgentHost = {
    detect: async () => {
      throw new Error('unused')
    },
    install: async () => {
      throw new Error('unused')
    },
    signIn: async () => {
      throw new Error('unused')
    },
    check: async () => {
      throw new Error('unused')
    },
    workspace: async () => '.',
    spawn: async (_def, options) => {
      const toClient = new TransformStream<Uint8Array>()
      const toAgent = new TransformStream<Uint8Array>()
      const agentConnection = new AgentSideConnection(
        () => ({
          initialize: async () => ({ protocolVersion: PROTOCOL_VERSION, agentCapabilities: {} }),
          newSession: async (params) => {
            chat = JSON.stringify(params).match(/[0-9a-f]{32}/)?.[0] ?? null
            return { sessionId: 'session-1' }
          },
          authenticate: async () => ({}),
          prompt: async () => {
            void toClient.writable.close().catch(() => undefined)
            options?.onExit?.()
            return new Promise<never>(() => {
              /* never answers: the process exited */
            })
          },
          cancel: async () => undefined
        }),
        ndJsonStream(toClient.writable, toAgent.readable)
      )
      void agentConnection
      return {
        input: toAgent.writable,
        output: toClient.readable,
        close: async () => {
          try {
            await toClient.writable.close()
          } catch {
            console.warn('crash host: stream already closed')
          }
        }
      }
    }
  }
  return { host, chat: () => chat }
}

/** Reads the reply to its end. A hung reply never ends, so the race below fails the test. */
async function drain(stream: ReadableStream<{ type: string }>) {
  const reader = stream.getReader()
  const types: string[] = []
  const read = (async () => {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return 'DONE'
      types.push(value.type)
    }
  })()
  // The crash ends the stream through the connection's close; a reply that hangs on the pending
  // prompt never settles, so a real deadline is the only way to fail that case (no event to await).
  const outcome = await Promise.race([
    read,
    new Promise<'TIMEOUT'>((resolve) => {
      setTimeout(() => resolve('TIMEOUT'), 2000)
    })
  ])
  reader.releaseLock()
  return { outcome, types }
}

test('an agent that exits mid-reply ends it with an error and releases the chat', async () => {
  store = createEditorStore()
  const { host, chat } = crashingHost()
  const transport = new ACPChatTransport({
    agentDef,
    host,
    store,
    automationAuthToken: async () => null,
    startupTimeoutMs: 2000
  })
  const stream = await transport.sendMessages({
    trigger: 'submit-message',
    chatId: 'crash',
    messageId: undefined,
    abortSignal: undefined,
    messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]
  })
  const { outcome, types } = await drain(stream as ReadableStream<{ type: string }>)
  expect(outcome).toBe('DONE')
  expect(types).toContain('error')
  expect(types).toContain('finish')
  expect(currentRun(store).active).toBe(false)
  const id = chat()
  expect(id).not.toBeNull()
  expect(agentChatDocument(id ?? undefined)).toBeUndefined()
  await transport.destroy()
})
