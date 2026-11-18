import { setTimeout as delay } from 'node:timers/promises'

/**
 * A stand-in ACP agent for tests that run one through the companion. It answers `initialize`,
 * opens a session, connects to the HTTP MCP servers the session names the way a real agent
 * does (so the app sees it reach Pairdraw's tools), and replies to each prompt by streaming
 * the prompt's last line back. A prompt carrying `<pairdraw-tool>{"name","arguments"}</pairdraw-tool>`
 * makes it call that Pairdraw tool first, as an agent designing does. The first argument names
 * it, as an adapter names its package.
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
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
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

/** Opens an MCP session on each HTTP server, as an agent does when its session starts. */
async function connectMCP(servers: McpServer[]): Promise<Client[]> {
  const clients: Client[] = []
  for (const server of servers) {
    if (!('type' in server) || server.type !== 'http') continue
    const headers = Object.fromEntries(server.headers.map(({ name, value }) => [name, value]))
    const client = new Client({ name: 'fake-acp', version: '1.0.0' })
    await client
      .connect(
        new StreamableHTTPClientTransport(new URL(server.url), {
          requestInit: { headers }
        })
      )
      .then(() => clients.push(client))
      .catch(() => undefined)
  }
  return clients
}

/** A tool call the prompt asked for, and the text it answered with. */
const callRequest = /<pairdraw-tool>([\s\S]*?)<\/pairdraw-tool>/g

const callSchema = v.object({
  name: v.string(),
  arguments: v.fallback(v.record(v.string(), v.unknown()), {})
})

/** The Pairdraw MCP sessions this agent's own session opened, as it starts. */
let toolClients: Client[] = []
/** The document the last call answered with, which a later `$target` argument names. */
let lastTarget: string | null = null

/** `$target` in a call's arguments, which names the document the previous call returned. */
function substituteTarget(value: unknown): unknown {
  if (value === '$target') return lastTarget ?? ''
  if (Array.isArray(value)) return value.map(substituteTarget)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, substituteTarget(entry)])
    )
  }
  return value
}

/** The call's arguments with `$target` filled in. */
function withTarget(args: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [key, substituteTarget(value)])
  )
}

/** Calls each Pairdraw tool the prompt named, as an agent designing does, in its order. */
async function callRequestedTools(prompt: string): Promise<string[]> {
  const requests = [...prompt.matchAll(callRequest)].map((match) => match[1] ?? '')
  const replies: string[] = []
  for (const request of requests) {
    const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), callSchema), request)
    if (!parsed.success) {
      replies.push('invalid tool request')
      continue
    }
    if (toolClients.length === 0) {
      replies.push('no Pairdraw tools')
      continue
    }
    const { text, value } = await callPairdrawTool(
      parsed.output.name,
      withTarget(parsed.output.arguments)
    )
    const target = v.safeParse(
      v.object({ target: v.optional(v.object({ documentId: v.string() })) }),
      value
    )
    if (target.success) lastTarget = target.output.target?.documentId ?? lastTarget
    replies.push(text)
  }
  return replies
}

const createdSchema = v.object({ target: v.object({ documentId: v.string() }) })

/** Calls one Pairdraw tool on the session's own MCP connection, as a real agent does. */
async function callPairdrawTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ text: string; value: unknown }> {
  const client = toolClients[0]
  if (!client) throw new Error('The agent has no Pairdraw server to call')
  const result = await client.callTool({ name, arguments: args })
  const part = result.content.find((entry) => entry.type === 'text')
  const text = part && 'text' in part ? part.text : ''
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson()), text)
  return { text, value: parsed.success ? parsed.output : text }
}

async function openNewDocument(): Promise<string> {
  const created = await callPairdrawTool('new_document', {})
  return v.parse(createdSchema, created.value).target.documentId
}

/**
 * The agent designs a new document over several seconds, as the owner's session did: it opens
 * one with `new_document`, then edits that document by its id while the chat's own document
 * stays in front.
 */
async function designInNewDocument(): Promise<void> {
  const documentId = await openNewDocument()
  for (let index = 0; index < 12; index += 1) {
    await callPairdrawTool('create_shape', {
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
  await callPairdrawTool('render', {
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

/**
 * A prompt naming this runs a shell command that fails after printing a long file, as Claude's
 * adapter reports a failed Bash call: a `tool_call`, then a `failed` update carrying the output.
 */
const FAILED_TOOL_MARKER = 'fail-tool'
const FAILED_TOOL_LINES = 400

function failedToolOutput(): string {
  const lines = Array.from({ length: FAILED_TOOL_LINES }, (_, line) => `README line ${line + 1}`)
  return [...lines, '(eval):1: ====== not found'].join('\n')
}

/** The failed shell call, as Claude's adapter reports it: started, then failed with its output. */
async function reportFailedTool(sessionId: string): Promise<void> {
  await connection.sessionUpdate({
    sessionId,
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'failed-terminal',
      title: 'Terminal',
      kind: 'execute',
      status: 'in_progress',
      rawInput: { command: 'cat README.md && echo ====== && cat assets/brand/README.md' }
    }
  })
  await connection.sessionUpdate({
    sessionId,
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'failed-terminal',
      status: 'failed',
      content: [{ type: 'content', content: { type: 'text', text: failedToolOutput() } }]
    }
  })
}

const connection: AgentSideConnection = new AgentSideConnection(
  () => ({
    initialize: async () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      agentInfo: { name, version: '1.0.0' }
    }),
    newSession: async ({ mcpServers }) => {
      toolClients = await connectMCP(mcpServers)
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
      // A prompt naming a Pairdraw tool makes it call that first, as an agent designing does.
      const called = await callRequestedTools(text)
      if (text.includes(FAILED_TOOL_MARKER)) {
        await reportFailedTool(sessionId)
        return { stopReason: 'end_turn' }
      }
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
          await callPairdrawTool('create_shape', {
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
            text: `echo: ${text.split('\n').at(-1) ?? ''}${
              called.length ? `\n${called.join('\n')}` : ''
            }${sessionNote()}`
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
