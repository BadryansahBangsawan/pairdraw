/**
 * A stand-in ACP agent the companion starts in the integration test. It answers `initialize`,
 * opens a session, and replies to each prompt by streaming the prompt's text back.
 */
import { Readable, Writable } from 'node:stream'

import { AgentSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'

const stream = ndJsonStream(
  Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
  Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>
)

const connection: AgentSideConnection = new AgentSideConnection(
  () => ({
    initialize: async () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      agentInfo: { name: 'fake-acp', version: '1.0.0' }
    }),
    newSession: async () => ({ sessionId: 'fake-session' }),
    authenticate: async () => ({}),
    prompt: async ({ sessionId, prompt }) => {
      const text = prompt.map((block) => (block.type === 'text' ? block.text : '')).join('')
      await connection.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: `echo: ${text}` }
        }
      })
      return { stopReason: 'end_turn' }
    },
    cancel: async () => undefined
  }),
  stream
)
