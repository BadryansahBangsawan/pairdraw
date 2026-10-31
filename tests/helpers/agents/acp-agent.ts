/**
 * A stand-in ACP agent for tests that run one through the companion. It answers `initialize`,
 * opens a session, connects to the HTTP MCP servers the session names the way a real agent
 * does (so the app sees it reach OpenPencil's tools), and replies to each prompt by streaming
 * the prompt's last line back. The first argument names it, as an adapter names its package.
 */
import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type McpServer
} from '@agentclientprotocol/sdk'

const name = process.argv[2] ?? 'fake-acp'

const stream = ndJsonStream(
  new WritableStream<Uint8Array>({
    write: (chunk) =>
      new Promise((resolve) => {
        process.stdout.write(chunk, () => resolve())
      })
  }),
  new ReadableStream<Uint8Array>({
    start(controller) {
      process.stdin.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
      process.stdin.on('end', () => controller.close())
    }
  })
)

/** Opens an MCP session on each HTTP server, as an agent does when its session starts. */
async function connectMCP(servers: McpServer[]): Promise<void> {
  for (const server of servers) {
    if (!('type' in server) || server.type !== 'http') continue
    const headers = Object.fromEntries(server.headers.map(({ name, value }) => [name, value]))
    await fetch(server.url, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'fake-acp', version: '1.0.0' }
        }
      })
    }).catch(() => undefined)
  }
}

const connection: AgentSideConnection = new AgentSideConnection(
  () => ({
    initialize: async () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      agentInfo: { name, version: '1.0.0' }
    }),
    newSession: async ({ mcpServers }) => {
      await connectMCP(mcpServers)
      return { sessionId: 'fake-session' }
    },
    authenticate: async () => ({}),
    prompt: async ({ sessionId, prompt }) => {
      const text = prompt.map((block) => (block.type === 'text' ? block.text : '')).join('')
      await connection.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: `echo: ${text.split('\n').at(-1) ?? ''}` }
        }
      })
      return { stopReason: 'end_turn' }
    },
    cancel: async () => undefined
  }),
  stream
)
