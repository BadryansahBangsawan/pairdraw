import { InMemoryTransport, type JSONRPCMessage } from '@modelcontextprotocol/client'
import * as v from 'valibot'

/** A tool the test server offers, and what calling it returns. */
export interface TestServerTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  annotations?: Record<string, unknown>
  call: (args: Record<string, unknown>) => { content: unknown[]; isError?: boolean }
}

const requestSchema = v.object({
  jsonrpc: v.literal('2.0'),
  id: v.union([v.string(), v.number()]),
  method: v.string(),
  params: v.optional(v.record(v.string(), v.unknown()))
})

export interface TestServerOptions {
  /** Lists tools in pages of this many, with a cursor, as large servers do. */
  pageSize?: number
}

/**
 * A minimal MCP server: it answers initialize, tools/list, and tools/call the way the protocol
 * specifies, and refuses anything else as an unknown method. Calls are recorded.
 */
export function createTestMCPServer(
  tools: TestServerTool[],
  { pageSize = tools.length || 1 }: TestServerOptions = {}
) {
  const calls: { name: string; args: Record<string, unknown> }[] = []

  function answer(message: unknown): JSONRPCMessage | null {
    const request = v.safeParse(requestSchema, message)
    if (!request.success) return null
    const { id, method, params = {} } = request.output
    const result = (value: Record<string, unknown>): JSONRPCMessage => ({
      jsonrpc: '2.0',
      id,
      result: value
    })
    switch (method) {
      case 'initialize':
        return result({
          protocolVersion:
            typeof params.protocolVersion === 'string' ? params.protocolVersion : '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'test-server', version: '1.0.0' }
        })
      case 'ping':
        return result({})
      case 'tools/list': {
        const start = typeof params.cursor === 'string' ? Number(params.cursor) : 0
        const end = start + pageSize
        return result({
          tools: tools.slice(start, end).map(({ name, description, inputSchema, annotations }) => ({
            name,
            description,
            inputSchema: inputSchema ?? { type: 'object' },
            annotations
          })),
          ...(end < tools.length && { nextCursor: String(end) })
        })
      }
      case 'tools/call': {
        const name = typeof params.name === 'string' ? params.name : ''
        const args = v.is(v.record(v.string(), v.unknown()), params.arguments)
          ? params.arguments
          : {}
        const tool = tools.find((candidate) => candidate.name === name)
        if (!tool) return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Unknown tool' } }
        calls.push({ name, args })
        return result(tool.call(args))
      }
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }
    }
  }

  /** A client transport linked to this server in memory. */
  function linkedTransport(): InMemoryTransport {
    const [client, server] = InMemoryTransport.createLinkedPair()
    server.onmessage = (message) => {
      const reply = answer(message)
      if (reply) void server.send(reply)
    }
    void server.start()
    return client
  }

  /** Answers one Streamable HTTP POST in its JSON response mode. */
  async function handleHTTP(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response(null, { status: 405 })
    const body = v.safeParse(v.pipe(v.string(), v.parseJson()), await request.text())
    if (!body.success) return new Response(null, { status: 400 })
    const reply = answer(body.output)
    if (!reply) return new Response(null, { status: 202 })
    return Response.json(reply, { headers: { 'mcp-session-id': 'test-session' } })
  }

  return { calls, answer, linkedTransport, handleHTTP }
}

export type TestMCPServer = ReturnType<typeof createTestMCPServer>
