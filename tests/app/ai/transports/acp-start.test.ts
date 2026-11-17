import { expect, test } from 'bun:test'

import { ACP_AGENTS } from '@pairdraw/core/constants'

import type { AgentHost } from '@/app/ai/agents/host/types'
import { classifyAIChatError } from '@/app/ai/chat/failure'
import { ACPChatTransport } from '@/app/ai/transports/acp'
import { AgentStartupTimeoutError } from '@/app/ai/transports/deadline'

const unsupported = async (): Promise<never> => {
  throw new Error('The silent host supports starting an agent only')
}

/** A host whose agent starts and then answers nothing, as an `initialize` nobody replies to. */
const silentHost: AgentHost = {
  detect: unsupported,
  install: unsupported,
  signIn: unsupported,
  check: unsupported,
  workspace: unsupported,
  spawn: async () => ({
    input: new WritableStream<Uint8Array>(),
    output: new ReadableStream<Uint8Array>(),
    close: async () => undefined
  })
}

test('a coding agent that never answers reports its start timeout', async () => {
  const agentDef = ACP_AGENTS[0]
  if (!agentDef) throw new Error('No ACP agent to start')
  const transport = new ACPChatTransport({
    agentDef,
    host: silentHost,
    startupTimeoutMs: 30,
    automationAuthToken: async () => null
  })
  const error = await transport
    .sendMessages({
      trigger: 'submit-message',
      chatId: 'acp-start',
      messageId: undefined,
      abortSignal: undefined,
      messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]
    })
    .catch((failure: unknown) => failure)
  expect(error).toBeInstanceOf(AgentStartupTimeoutError)
  expect(classifyAIChatError(error).reason).toBe('agent-timeout')
})
