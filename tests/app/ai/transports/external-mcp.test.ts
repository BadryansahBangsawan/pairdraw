import 'fake-indexeddb/auto'
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'

import { simulateReadableStream, type UIMessage } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'

import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import { createEditorStore } from '@/app/editor/session/create'
import {
  mcpConnectionSettingsSnapshot,
  replaceMCPConnectionSettings,
  type MCPConnectionSettings
} from '@/app/integrations/mcp'
import { createExternalMCPTools } from '@/app/integrations/mcp/client/session'

import { MOCK_USAGE } from '#tests/helpers/chat/usage'
import { createTestMCPServer } from '#tests/helpers/mcp/external-server'

const TOOL = 'mcp__design-notes__lookup'

const mcp = createTestMCPServer([
  {
    name: 'lookup',
    description: 'Looks up a design note',
    inputSchema: { type: 'object', properties: { topic: { type: 'string' } } },
    call: ({ topic }) => ({ content: [{ type: 'text', text: `Notes on ${String(topic)}` }] })
  }
])
let server: ReturnType<typeof Bun.serve>
let original: MCPConnectionSettings

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch: (request) => mcp.handleHTTP(request)
  })
  original = mcpConnectionSettingsSnapshot()
})
afterAll(() => {
  void server.stop(true)
})
afterEach(() => {
  replaceMCPConnectionSettings(original)
})

async function readAll(stream: ReadableStream<unknown>): Promise<unknown[]> {
  const reader = stream.getReader()
  const chunks: unknown[] = []
  try {
    for (let read = await reader.read(); !read.done; read = await reader.read()) {
      chunks.push(read.value)
    }
  } finally {
    reader.releaseLock()
  }
  return chunks
}

function textModel() {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: null,
        chunkDelayInMs: null,
        chunks: [
          { type: 'text-start', id: 'reply' },
          { type: 'text-delta', id: 'reply', delta: 'Done' },
          { type: 'text-end', id: 'reply' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: MOCK_USAGE }
        ]
      })
    })
  })
}

/** Calls the external tool first, then answers with text once its result arrives. */
function toolCallingModel() {
  let step = 0
  return new MockLanguageModelV4({
    doStream: async () => {
      step++
      if (step === 1) {
        return {
          stream: simulateReadableStream({
            initialDelayInMs: null,
            chunkDelayInMs: null,
            chunks: [
              {
                type: 'tool-call',
                toolCallId: 'call-1',
                toolName: TOOL,
                input: JSON.stringify({ topic: 'buttons' })
              },
              {
                type: 'finish',
                finishReason: { unified: 'tool-calls', raw: undefined },
                usage: MOCK_USAGE
              }
            ]
          })
        }
      }
      return {
        stream: simulateReadableStream({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks: [
            { type: 'text-start', id: 'reply' },
            { type: 'text-delta', id: 'reply', delta: 'Done' },
            { type: 'text-end', id: 'reply' },
            { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: MOCK_USAGE }
          ]
        })
      }
    }
  })
}

test('the direct chat offers an enabled external MCP server’s tools and calls them', async () => {
  replaceMCPConnectionSettings({
    version: 1,
    connections: [
      {
        id: 'mcp-notes',
        name: 'Design notes',
        enabled: true,
        transport: { type: 'streamable-http', url: `http://127.0.0.1:${server.port}/mcp` },
        authentication: { type: 'none' }
      }
    ]
  })
  const store = createEditorStore()
  const model = toolCallingModel()
  try {
    const transport = createToolLoopTransport({
      store,
      providerID: 'anthropic',
      model,
      effectiveModelID: 'claude-test',
      maxOutputTokens: 100,
      thinkingLevel: () => 'default'
    })
    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      chatId: 'external-mcp',
      messageId: undefined,
      abortSignal: undefined,
      messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Check notes' }] }]
    })
    const reader = stream.getReader()
    const chunks: unknown[] = []
    try {
      for (let read = await reader.read(); !read.done; read = await reader.read()) {
        chunks.push(read.value)
      }
    } finally {
      reader.releaseLock()
    }

    const offered = model.doStreamCalls[0]?.tools?.map((tool) => tool.name) ?? []
    expect(offered).toContain(TOOL)
    expect(mcp.calls).toEqual([{ name: 'lookup', args: { topic: 'buttons' } }])
    expect(chunks).toContainEqual(
      expect.objectContaining({ type: 'tool-output-available', toolCallId: 'call-1' })
    )
  } finally {
    store.dispose()
  }
})

test('earlier external results reach the model as files and cut text, after the server is gone', async () => {
  replaceMCPConnectionSettings({ version: 1, connections: [] })
  const store = createEditorStore()
  const model = textModel()
  const externalMCP = createExternalMCPTools()
  const result = {
    content: [
      { type: 'image', data: 'AAAA', mimeType: 'image/png' },
      { type: 'text', text: 'x'.repeat(60_000) }
    ]
  }
  const messages: UIMessage[] = [
    { id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'Take a screenshot' }] },
    {
      id: 'reply-1',
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        {
          type: 'dynamic-tool',
          toolName: 'mcp__browser__screenshot',
          toolCallId: 'call-1',
          state: 'output-available',
          input: {},
          output: result
        },
        { type: 'text', text: 'Here it is.' }
      ]
    },
    { id: 'user-2', role: 'user', parts: [{ type: 'text', text: 'Thanks' }] }
  ]
  try {
    const transport = createToolLoopTransport({
      store,
      providerID: 'anthropic',
      model,
      effectiveModelID: 'claude-test',
      maxOutputTokens: 100,
      thinkingLevel: () => 'default',
      externalMCP
    })
    await readAll(
      await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'external-mcp-history',
        messageId: undefined,
        abortSignal: undefined,
        messages
      })
    )
    const prompt = model.doStreamCalls[0]?.prompt ?? []
    const toolResults = prompt.flatMap((message) =>
      message.role === 'tool' ? message.content.filter((part) => part.type === 'tool-result') : []
    )
    expect(toolResults).toHaveLength(1)
    const output = toolResults[0]?.output
    expect(output.type).toBe('content')
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('"type":"json"')
    expect(serialized).toContain('image/png')
    expect(serialized).toContain('[truncated]')
    expect(serialized.length).toBeLessThan(55_000)
  } finally {
    externalMCP.close()
    store.dispose()
  }
})
