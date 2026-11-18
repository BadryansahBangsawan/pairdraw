import { setTimeout as delay } from 'node:timers/promises'

/**
 * A stand-in ACP agent for tests that run one through the companion. It answers `initialize`,
 * opens a session, connects to the HTTP MCP servers the session names the way a real agent
 * does (so the app sees it reach Pairdraw's tools), and replies to each prompt by streaming
 * the prompt's last line back. The first argument names it, as an adapter names its package.
 * Like Codex and Claude's adapters, it advertises a model and reasoning effort as session config
 * options and a session mode; once any differs from its default, each reply names them.
 */
import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type McpServer,
  type SessionConfigOption
} from '@agentclientprotocol/sdk'
import * as v from 'valibot'

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

const servers = new Map<string, MCPServerSession>()

/** An agent's open MCP session on one of the servers its ACP session named. */
interface MCPServerSession {
  url: string
  headers: Record<string, string>
  sessionId: string | null
}

/** Opens an MCP session on each HTTP server, as an agent does when its session starts. */
async function connectMCP(serversNamed: McpServer[]): Promise<void> {
  for (const server of serversNamed) {
    if (!('type' in server) || server.type !== 'http') continue
    const headers = Object.fromEntries(server.headers.map(({ name, value }) => [name, value]))
    const response = await fetch(server.url, {
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
    if (!response) continue
    await response.text().catch(() => undefined)
    servers.set(server.url, {
      url: server.url,
      headers,
      sessionId: response.headers.get('mcp-session-id')
    })
  }
}

/** The JSON a Streamable HTTP reply carries, which arrives as JSON or as one SSE event. */
function replyBody(text: string): unknown {
  const trimmed = text.trim()
  const raw =
    trimmed.startsWith('event:') || trimmed.startsWith('data:')
      ? trimmed
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('')
      : trimmed
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson()), raw)
  return parsed.success ? parsed.output : null
}

const textPartSchema = v.object({ type: v.literal('text'), text: v.string() })
const toolReplySchema = v.object({
  result: v.object({ content: v.array(v.unknown()) })
})
const createdSchema = v.object({ target: v.object({ documentId: v.string() }) })

/** Calls one Pairdraw tool over the MCP session, as the agent under test does. */
async function callMCPTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const server = [...servers.values()][0]
  if (!server) throw new Error('The agent has no MCP server to call')
  const response = await fetch(server.url, {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: {
      ...server.headers,
      ...(server.sessionId ? { 'mcp-session-id': server.sessionId } : {}),
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name, arguments: args }
    })
  })
  const reply = v.safeParse(toolReplySchema, replyBody(await response.text()))
  if (!reply.success) throw new Error(`MCP tool ${name} returned no content`)
  for (const part of reply.output.result.content) {
    if (!v.is(textPartSchema, part)) continue
    const parsed = v.safeParse(v.pipe(v.string(), v.parseJson()), part.text)
    return parsed.success ? parsed.output : part.text
  }
  return null
}

async function openNewDocument(): Promise<string> {
  const created = v.parse(createdSchema, await callMCPTool('new_document', {}))
  return created.target.documentId
}

/**
 * The agent designs a new document over several seconds, as the owner's session did: it opens
 * one with `new_document`, then edits that document by its id while the chat's own document
 * stays in front.
 */
async function designInNewDocument(): Promise<void> {
  const documentId = await openNewDocument()
  for (let index = 0; index < 12; index += 1) {
    await callMCPTool('create_shape', {
      document_id: documentId,
      type: 'RECTANGLE',
      x: 24 + (index % 6) * 48,
      y: 24 + Math.floor(index / 6) * 48,
      width: 32,
      height: 32,
      name: `Card ${index}`
    })
    await delay(1500)
  }
  await callMCPTool('render', {
    document_id: documentId,
    jsx: '<Frame name="Mockup" w={320} h={200} bg="#FFFFFF"><Text name="Title" size={24}>Mockup</Text></Frame>'
  })
}

const DEFAULTS = { model: 'fake-fast', effort: 'medium', mode: 'ask' }
const session = { ...DEFAULTS }

function configOptions(): SessionConfigOption[] {
  return [
    {
      type: 'select',
      id: 'model',
      name: 'Model',
      category: 'model',
      currentValue: session.model,
      options: [
        { value: 'fake-fast', name: 'Fake Fast' },
        { value: 'fake-smart', name: 'Fake Smart' }
      ]
    },
    {
      type: 'select',
      id: 'reasoning',
      name: 'Reasoning',
      category: 'thought_level',
      currentValue: session.effort,
      options: [
        { value: 'medium', name: 'Medium' },
        { value: 'high', name: 'High' }
      ]
    }
  ]
}

/** What the reply adds once the session left its defaults, so a test sees what applied. */
function sessionNote(): string {
  const changed = session.model !== DEFAULTS.model || session.effort !== DEFAULTS.effort
  return changed || session.mode !== DEFAULTS.mode
    ? ` [${session.model}, ${session.effort}, ${session.mode}]`
    : ''
}

/**
 * A prompt naming this stays quiet: the agent streams one update and then waits, as a coding agent
 * does while thinking or running a long command, until the person stops it.
 */
const QUIET_MARKER = 'stay-quiet'
let finishQuiet: (() => void) | null = null

/**
 * A prompt naming this designs a new document, as a coding agent does when the person asks for
 * one: it opens the document and keeps editing it while the chat's own document stays in front.
 */
const DESIGN_MARKER = 'design-in-new-document'

/**
 * A prompt naming this works in a document of its own for a while and keeps saying so, so a test
 * has time to press keys while the reply runs.
 */
const SLOW_MARKER = 'slow-reply'

/** A prompt naming this works for a while in the document the chat belongs to. */
const SLOW_HERE_MARKER = 'slow-here'

const connection: AgentSideConnection = new AgentSideConnection(
  () => ({
    initialize: async () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      agentInfo: { name, version: '1.0.0' }
    }),
    newSession: async ({ mcpServers }) => {
      await connectMCP(mcpServers)
      return {
        sessionId: 'fake-session',
        configOptions: configOptions(),
        modes: {
          currentModeId: session.mode,
          availableModes: [
            { id: 'ask', name: 'Ask before edits' },
            { id: 'auto', name: 'Auto' }
          ]
        }
      }
    },
    setSessionConfigOption: async ({ configId, value }) => {
      if (configId === 'model') session.model = value
      else if (configId === 'reasoning') session.effort = value
      return { configOptions: configOptions() }
    },
    setSessionMode: async ({ modeId }) => {
      session.mode = modeId
      return {}
    },
    authenticate: async () => ({}),
    prompt: async ({ sessionId, prompt }) => {
      const text = prompt.map((block) => (block.type === 'text' ? block.text : '')).join('')
      if (text.includes(QUIET_MARKER)) {
        await connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'working on it' }
          }
        })
        await new Promise<void>((resolve) => {
          finishQuiet = resolve
        })
        return { stopReason: 'cancelled' }
      }
      if (text.includes(SLOW_HERE_MARKER)) {
        await connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'working here' }
          }
        })
        for (let index = 0; index < 8; index += 1) {
          await delay(1000)
          await connection.sessionUpdate({
            sessionId,
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: { type: 'text', text: ' still here' }
            }
          })
        }
        await connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: ' finished here' }
          }
        })
        return { stopReason: 'end_turn' }
      }
      if (text.includes(SLOW_MARKER)) {
        await connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'working slowly' }
          }
        })
        const documentId = await openNewDocument()
        for (let index = 0; index < 10; index += 1) {
          await callMCPTool('create_shape', {
            document_id: documentId,
            type: 'RECTANGLE',
            x: 24 + index * 40,
            y: 24,
            width: 32,
            height: 32,
            name: `Card ${index}`
          })
          await connection.sessionUpdate({
            sessionId,
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: { type: 'text', text: ' still working' }
            }
          })
          await delay(1000)
        }
        await connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: ' finished slowly' }
          }
        })
        return { stopReason: 'end_turn' }
      }
      if (text.includes(DESIGN_MARKER)) {
        await connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'opening a new document' }
          }
        })
        await designInNewDocument()
        await connection.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'finished the mockup' }
          }
        })
        return { stopReason: 'end_turn' }
      }
      await connection.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: {
            type: 'text',
            text: `echo: ${text.split('\n').at(-1) ?? ''}${sessionNote()}`
          }
        }
      })
      return { stopReason: 'end_turn' }
    },
    cancel: async () => {
      finishQuiet?.()
      finishQuiet = null
    }
  }),
  stream
)
