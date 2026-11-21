import { expect, test } from 'bun:test'

import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Agent,
  type McpServer
} from '@agentclientprotocol/sdk'

import { ACP_AGENTS, MCP_CHAT_HEADER } from '@pairdraw/core/constants'
import { SceneGraph } from '@pairdraw/scene-graph'

import type { AgentHost } from '@/app/ai/agents/host/types'
import { ACPChatTransport } from '@/app/ai/transports/acp'
import { agentStarted, endAgentSession } from '@/app/automation/agents'
import { createEditorStore } from '@/app/editor/session'
import { presenceOf } from '@/app/presence/registry'

import { expectDefined } from '#tests/helpers/assert'

const unsupported = async (): Promise<never> => {
  throw new Error('The in-memory host starts an agent only')
}

function pairedStreams() {
  const clientToAgent = new TransformStream()
  const agentToClient = new TransformStream()
  return {
    client: { writable: clientToAgent.writable, readable: agentToClient.readable },
    agent: { writable: agentToClient.writable, readable: clientToAgent.readable }
  }
}

/** The chat a session's MCP servers carry, as the agent reads it when it connects. */
function chatOf(servers: McpServer[]): string | null {
  for (const server of servers) {
    if (!('headers' in server)) continue
    const header = server.headers.find(({ name }) => name === MCP_CHAT_HEADER)
    if (header) return header.value
  }
  return null
}

test("an agent that exits stops naming its chat's provider", async () => {
  const agentDef = expectDefined(ACP_AGENTS[0], 'a coding agent')
  const streams = pairedStreams()
  let chat: string | null = null
  let exit = null as (() => void) | null
  const agent: Agent = {
    initialize: async () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false }
    }),
    newSession: async ({ mcpServers }) => {
      chat = chatOf(mcpServers)
      return { sessionId: 'session-exit' }
    },
    authenticate: async () => ({}),
    prompt: async () => ({ stopReason: 'end_turn' }),
    cancel: async () => undefined
  }
  const agentConnection = new AgentSideConnection(
    () => agent,
    ndJsonStream(streams.agent.writable, streams.agent.readable)
  )
  const host: AgentHost = {
    detect: unsupported,
    install: unsupported,
    signIn: unsupported,
    check: unsupported,
    workspace: unsupported,
    spawn: async (_agent, options) => {
      exit = options?.onExit ?? null
      return {
        input: streams.client.writable,
        output: streams.client.readable,
        close: async () => undefined
      }
    }
  }
  const transport = new ACPChatTransport({
    agentDef,
    host,
    automationAuthToken: async () => null
  })
  const store = createEditorStore(new SceneGraph())
  const pageId = expectDefined(store.graph.getPages()[0], 'page').id
  const probe = (session: string) => {
    agentStarted(store, { session, kind: 'acp', chat: expectDefined(chat, 'chat') }, pageId)
    return presenceOf(store).agents.value[0]?.provider
  }
  try {
    await transport.sendMessages({
      trigger: 'submit-message',
      chatId: 'acp-exit',
      messageId: undefined,
      abortSignal: undefined,
      messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]
    })
    // The session's chat is named by the coding agent it runs while the agent is alive.
    expect(probe('session-alive')).toBe(`acp:${agentDef.id}`)
    endAgentSession('session-alive')

    expectDefined(exit, 'the agent exit hook')()
    expect(probe('session-after-exit')).toBeUndefined()
  } finally {
    // The agent's side answers the transport while it runs; close it with the streams.
    void agentConnection
    endAgentSession('session-after-exit')
    await transport.destroy()
    store.preparationController.dispose()
  }
})
