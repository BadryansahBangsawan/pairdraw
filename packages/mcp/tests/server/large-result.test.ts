import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { WebSocket } from 'ws'

import { startServer, type ServerHandle } from '#mcp/server'

const AUTH_TOKEN = 'large-result-token'
/** Larger than any reply a chat can absorb, and past the size that used to be sent whole. */
const BIG_TEXT_LENGTH = 230_000

/**
 * A coding agent reaches Pairdraw over the session's streamable HTTP transport. A result far
 * larger than a chat reply must not end that session: the agent's next call has to work.
 */
describe('a very large tool result', () => {
  let handle: ServerHandle | undefined
  let client: Client | undefined
  let app: WebSocket | undefined

  beforeEach(async () => {
    handle = await startServer({
      httpPort: 0,
      withTcp: true,
      socketPath: null,
      authToken: AUTH_TOKEN,
      enableEval: false,
      mcpRoot: null
    })
    app = await registerApp(handle.httpPort)
    client = new Client({ name: 'large-result', version: '0.0.0' })
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${handle.httpPort}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
      })
    )
  }, 15_000)

  afterEach(async () => {
    await client?.close().catch(() => undefined)
    app?.close()
    await handle?.close().catch(() => undefined)
    handle = undefined
    client = undefined
    app = undefined
  })

  test('does not end the agent session', async () => {
    if (!client) throw new Error('client not initialized')
    const big = await client.callTool({ name: 'get_page_tree', arguments: {} })
    expect(big.isError).not.toBe(true)
    const text = (big.content as { type: string; text?: string }[]).find(
      (item) => item.type === 'text'
    )?.text
    expect(text?.length ?? 0).toBeGreaterThan(BIG_TEXT_LENGTH)

    const next = await client.callTool({
      name: 'create_shape',
      arguments: { type: 'FRAME', x: 0, y: 0, width: 100, height: 100 }
    })
    expect(next.isError).not.toBe(true)
  }, 20_000)
})

/** The app behind the bridge: registers, then answers every tool call, the first one huge. */
function registerApp(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`)
    let toolCalls = 0
    ws.once('error', reject)
    ws.once('open', () => {
      ws.send(JSON.stringify({ type: 'register', token: AUTH_TOKEN }))
      resolve(ws)
    })
    ws.on('message', (raw) => {
      const message: unknown = JSON.parse(String(raw))
      if (typeof message !== 'object' || message === null) return
      if (!('type' in message) || message.type !== 'request') return
      if (!('id' in message) || typeof message.id !== 'string') return
      // The session-opened notice and anything else answer with nothing to report.
      const isToolCall = 'command' in message && message.command === 'tool'
      if (isToolCall) toolCalls += 1
      const result =
        isToolCall && toolCalls === 1
          ? { tree: 'x'.repeat(BIG_TEXT_LENGTH) }
          : { id: '1:1', type: 'FRAME' }
      ws.send(JSON.stringify({ type: 'response', id: message.id, ok: true, result }))
    })
  })
}
