import { afterEach, describe, expect, test } from 'bun:test'

import type { ToolExecutionOptions, ToolSet, UIMessage } from 'ai'

import {
  createExternalMCPTools,
  defaultMCPConnectDependencies,
  mcpChatToolName,
  mcpHistoryTools,
  mcpModelOutput,
  testMCPConnection,
  type MCPConnectDependencies
} from '@/app/integrations/mcp/client'
import { MCPStdioError, type MCPStdioNative } from '@/app/integrations/mcp/stdio/native'
import type { MCPConnection } from '@/app/integrations/mcp/types'

import { createTestMCPServer, type TestMCPServer } from '#tests/helpers/mcp/external-server'

const remote = (name: string, url = 'https://example.com/mcp'): MCPConnection => ({
  id: `mcp-${name.toLowerCase()}`,
  name,
  enabled: true,
  transport: { type: 'streamable-http', url },
  authentication: { type: 'none' }
})

function dependencies(
  servers: Record<string, TestMCPServer>,
  overrides: Partial<MCPConnectDependencies> = {}
): MCPConnectDependencies {
  return {
    ...defaultMCPConnectDependencies,
    desktop: () => false,
    transport: (connection) => servers[connection.name]?.linkedTransport() ?? null,
    ...overrides
  }
}

const callOptions = (toolCallId: string): ToolExecutionOptions<unknown> => ({
  toolCallId,
  messages: [],
  context: {}
})

async function call(tools: ToolSet, name: string, input: unknown): Promise<unknown> {
  const execute = tools[name]?.execute
  if (!execute) throw new Error(`No tool ${name}`)
  return execute(input, callOptions('call-1'))
}

const opened: { close(): void }[] = []
afterEach(() => {
  for (const tools of opened.splice(0)) tools.close()
})

describe('external MCP tools for the direct chat', () => {
  test('offers a connected server’s tools under prefixed names and calls the server', async () => {
    const server = createTestMCPServer([
      {
        name: 'search_pages',
        description: 'Searches pages',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
        call: ({ query }) => ({ content: [{ type: 'text', text: `Found ${String(query)}` }] })
      }
    ])
    const external = createExternalMCPTools({
      connections: () => [remote('Notion')],
      dependencies: dependencies({ Notion: server })
    })
    opened.push(external)

    const tools = await external.tools()
    expect(Object.keys(tools)).toEqual(['mcp__notion__search_pages'])
    const result = await call(tools, 'mcp__notion__search_pages', { query: 'pricing' })
    expect(server.calls).toEqual([{ name: 'search_pages', args: { query: 'pricing' } }])
    expect(mcpModelOutput(result)).toEqual({
      type: 'content',
      value: [{ type: 'text', text: 'Found pricing' }]
    })
  })

  test('fails a call the server marks as an error', async () => {
    const server = createTestMCPServer([
      {
        name: 'broken',
        call: () => ({ content: [{ type: 'text', text: 'Quota exceeded' }], isError: true })
      }
    ])
    const external = createExternalMCPTools({
      connections: () => [remote('Linear')],
      dependencies: dependencies({ Linear: server })
    })
    opened.push(external)
    const tools = await external.tools()
    await expect(call(tools, 'mcp__linear__broken', {})).rejects.toThrow('Quota exceeded')
  })

  test('leaves out a server that cannot connect and keeps the others', async () => {
    const working = createTestMCPServer([{ name: 'ping', call: () => ({ content: [] }) }])
    const external = createExternalMCPTools({
      connections: () => [
        remote('Working'),
        {
          ...remote('Local'),
          transport: { type: 'stdio', command: 'npx', args: [], envNames: [] }
        }
      ],
      dependencies: dependencies({ Working: working })
    })
    opened.push(external)
    expect(Object.keys(await external.tools())).toEqual(['mcp__working__ping'])
  })

  test('asks before a call when approval is required and reports a decline', async () => {
    const server = createTestMCPServer([
      {
        name: 'delete_issue',
        annotations: { destructiveHint: true },
        call: () => ({ content: [{ type: 'text', text: 'deleted' }] })
      }
    ])
    const requests: { tool: string; readOnly: boolean }[] = []
    const external = createExternalMCPTools({
      connections: () => [remote('Linear')],
      dependencies: dependencies({ Linear: server })
    })
    opened.push(external)
    const tools = await external.tools({
      approve: async (request) => {
        requests.push({ tool: request.tool, readOnly: request.readOnly })
        return false
      }
    })
    await call(tools, 'mcp__linear__delete_issue', {})
    expect(requests).toEqual([{ tool: 'delete_issue', readOnly: false }])
    expect(server.calls).toEqual([])
  })

  test('reconnects a connection that changed and drops one that was turned off', async () => {
    const first = createTestMCPServer([{ name: 'a', call: () => ({ content: [] }) }])
    const second = createTestMCPServer([{ name: 'b', call: () => ({ content: [] }) }])
    let connections = [remote('Server')]
    let current = first
    const external = createExternalMCPTools({
      connections: () => connections,
      dependencies: dependencies(
        {},
        { transport: (connection) => (connection.enabled ? current.linkedTransport() : null) }
      )
    })
    opened.push(external)
    expect(Object.keys(await external.tools())).toEqual(['mcp__server__a'])

    current = second
    expect(Object.keys(await external.tools())).toEqual(['mcp__server__a'])
    connections = [remote('Server', 'https://example.com/other')]
    expect(Object.keys(await external.tools())).toEqual(['mcp__server__b'])
    connections = []
    expect(await external.tools()).toEqual({})
  })

  test('keeps servers connected while a reply holds them, past the idle time', async () => {
    const server = createTestMCPServer([
      { name: 'ping', call: () => ({ content: [{ type: 'text', text: 'pong' }] }) }
    ])
    let connects = 0
    const external = createExternalMCPTools({
      connections: () => [remote('Server')],
      dependencies: dependencies(
        {},
        {
          transport: () => {
            connects++
            return server.linkedTransport()
          }
        }
      ),
      idleCloseMs: 20
    })
    opened.push(external)
    const release = external.hold()
    const tools = await external.tools()
    await Bun.sleep(60)
    expect(await call(tools, 'mcp__server__ping', {})).toMatchObject({
      content: [{ type: 'text', text: 'pong' }]
    })
    expect(connects).toBe(1)
    release()
  })

  test('reconnects for a call after idle servers were disconnected', async () => {
    const server = createTestMCPServer([{ name: 'ping', call: () => ({ content: [] }) }])
    let connects = 0
    const external = createExternalMCPTools({
      connections: () => [remote('Server')],
      dependencies: dependencies(
        {},
        {
          transport: () => {
            connects++
            return server.linkedTransport()
          }
        }
      ),
      idleCloseMs: 20
    })
    opened.push(external)
    const tools = await external.tools()
    await Bun.sleep(60)
    await call(tools, 'mcp__server__ping', {})
    expect(connects).toBe(2)
    expect(server.calls).toEqual([{ name: 'ping', args: {} }])
  })

  test('does not ask again about a local command the person declined', async () => {
    let asked = 0
    const shell: MCPStdioNative = {
      approve: async () => '',
      spawn: async () => {
        asked++
        throw new MCPStdioError('declined')
      },
      write: async () => undefined,
      close: async () => undefined
    }
    const local: MCPConnection = {
      ...remote('Local'),
      transport: { type: 'stdio', command: 'npx', args: [], envNames: [] }
    }
    let connections = [local]
    const external = createExternalMCPTools({
      connections: () => connections,
      dependencies: dependencies(
        {},
        { desktop: () => true, stdio: shell, env: async () => ({}), transport: () => null }
      )
    })
    opened.push(external)
    expect(await external.tools()).toEqual({})
    expect(await external.tools()).toEqual({})
    expect(asked).toBe(1)
    connections = [
      { ...local, transport: { type: 'stdio', command: 'npx', args: ['-y'], envNames: [] } }
    ]
    await external.tools()
    expect(asked).toBe(2)
  })

  test('a stopped message stops waiting for a server that does not answer', async () => {
    const external = createExternalMCPTools({
      connections: () => [remote('Slow')],
      dependencies: dependencies(
        {},
        {
          transport: () => null,
          fetch: () =>
            new Promise<Response>(() => {
              // The server never answers.
            })
        }
      )
    })
    opened.push(external)
    const controller = new AbortController()
    const listing = external.tools({ signal: controller.signal })
    controller.abort()
    expect(await listing).toEqual({})
  })

  test('offers every page of a server’s tools', async () => {
    const server = createTestMCPServer(
      ['a', 'b', 'c'].map((name) => ({ name, call: () => ({ content: [] }) })),
      { pageSize: 2 }
    )
    const external = createExternalMCPTools({
      connections: () => [remote('Paged')],
      dependencies: dependencies({ Paged: server })
    })
    opened.push(external)
    expect(Object.keys(await external.tools())).toEqual([
      'mcp__paged__a',
      'mcp__paged__b',
      'mcp__paged__c'
    ])
  })

  test('converts earlier results in history the way new ones are, even without the server', async () => {
    const messages: UIMessage[] = [
      {
        id: 'reply',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'mcp__gone__screenshot',
            toolCallId: 'call-1',
            state: 'output-available',
            input: {},
            output: { content: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }] }
          },
          {
            type: 'dynamic-tool',
            toolName: 'other',
            toolCallId: 'call-2',
            state: 'input-available',
            input: {}
          }
        ]
      }
    ]
    const tools = mcpHistoryTools(messages)
    expect(Object.keys(tools)).toEqual(['mcp__gone__screenshot'])
    const output = await tools['mcp__gone__screenshot']?.toModelOutput?.({
      toolCallId: 'call-1',
      input: {},
      output: { content: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }] }
    })
    expect(output).toEqual({
      type: 'content',
      value: [{ type: 'file', mediaType: 'image/png', data: { type: 'data', data: 'AAAA' } }]
    })
  })

  test('names stay unique and within provider limits', () => {
    const taken = new Set<string>()
    const first = mcpChatToolName('My Server', 'search', taken)
    taken.add(first)
    expect(first).toBe('mcp__my-server__search')
    expect(mcpChatToolName('my_server', 'search', taken)).toBe('mcp__my-server__search_2')
    const long = mcpChatToolName('Server', 'x'.repeat(100), new Set())
    expect(long.length).toBeLessThanOrEqual(64)
    expect(long).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  test('turns images into files and structured results into text', () => {
    expect(
      mcpModelOutput({ content: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }] })
    ).toEqual({
      type: 'content',
      value: [{ type: 'file', mediaType: 'image/png', data: { type: 'data', data: 'AAAA' } }]
    })
    expect(mcpModelOutput({ content: [], structuredContent: { rows: 2 } })).toEqual({
      type: 'text',
      value: '{"rows":2}'
    })
  })
})

describe('testing a connection', () => {
  test('counts the tools of a server that answers', async () => {
    const server = createTestMCPServer([
      { name: 'one', call: () => ({ content: [] }) },
      { name: 'two', call: () => ({ content: [] }) }
    ])
    expect(await testMCPConnection(remote('Server'), dependencies({ Server: server }))).toEqual({
      ok: true,
      tools: 2
    })
  })

  test('counts every page of a server’s tools', async () => {
    const server = createTestMCPServer(
      ['a', 'b', 'c', 'd', 'e'].map((name) => ({ name, call: () => ({ content: [] }) })),
      { pageSize: 2 }
    )
    expect(await testMCPConnection(remote('Server'), dependencies({ Server: server }))).toEqual({
      ok: true,
      tools: 5
    })
  })

  test('says a local command needs the desktop app', async () => {
    const local: MCPConnection = {
      ...remote('Local'),
      transport: { type: 'stdio', command: 'npx', args: [], envNames: [] }
    }
    expect(await testMCPConnection(local, dependencies({}))).toEqual({
      ok: false,
      reason: 'desktop-only'
    })
  })

  test('says a bearer connection without a token needs one', async () => {
    const connection: MCPConnection = {
      ...remote('Bearer'),
      authentication: {
        type: 'bearer',
        credentialRef: { integrationId: 'mcp', profileId: 'mcp-bearer', field: 'bearer-token' }
      }
    }
    expect(
      await testMCPConnection(connection, dependencies({}, { bearer: async () => null }))
    ).toEqual({ ok: false, reason: 'credential' })
  })
})
