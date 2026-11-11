import type { Client, Tool as MCPTool } from '@modelcontextprotocol/client'
import type { ToolSet } from 'ai'
import { compact, isEqual } from 'es-toolkit'
import { TimeoutError } from 'es-toolkit/error'
import { withTimeout } from 'es-toolkit/promise'

import { describeDiagnosticError, recordMCPConnectionFailure } from '@/app/diagnostics'

import { enabledMCPConnections } from '../store'
import type { MCPConnection, MCPConnectionID } from '../types'
import type { MCPClientSession, MCPConnectDependencies } from './connect'
import { MCPConnectError } from './errors'
import { buildMCPChatTools, type MCPChatToolOptions, type MCPServerTools } from './tools'

/** A server that does not answer in this time is left out of the message. */
const CONNECT_TIMEOUT_MS = 15_000
/** A local command may first wait for the person to approve it. */
const STDIO_CONNECT_TIMEOUT_MS = 2 * 60_000
const LIST_TIMEOUT_MS = 10_000
/** Servers no chat has used for this long are disconnected; local ones stop. */
const IDLE_CLOSE_MS = 5 * 60_000
/** A server that timed out is not tried again for this long, so it cannot slow every message. */
const TIMEOUT_BACKOFF_MS = 60_000

interface OpenServer {
  /** The connection as it was when connected; a change in Settings reconnects. */
  connection: MCPConnection
  session: Promise<MCPClientSession | null>
}

/** A connection left out until it changes, or until `until`. */
interface FailedServer {
  connection: MCPConnection
  until: number
}

interface ExternalMCPToolsOptions {
  connections?: () => MCPConnection[]
  dependencies?: MCPConnectDependencies
  idleCloseMs?: number
  /** Milliseconds since the epoch; tests pass their own clock. */
  now?: () => number
}

interface ExternalMCPToolsRequest extends MCPChatToolOptions {
  /** Stops waiting for slow servers: the message goes on without their tools. */
  signal?: AbortSignal
}

export interface ExternalMCPTools {
  /** Connects the enabled servers that are not yet connected and returns all their tools. */
  tools(request?: ExternalMCPToolsRequest): Promise<ToolSet>
  /**
   * Keeps every server connected until the returned release is called, as a chat does for the
   * whole of a reply; the idle timer only runs while nothing holds the servers.
   */
  hold(): () => void
  /** Disconnects every server and stops local ones. */
  close(): void
}

function recordFailure(error: unknown): void {
  recordMCPConnectionFailure({ operation: 'connect', ...describeDiagnosticError(error) })
}

/** Every tool a server offers, following its pages. */
export async function listAllMCPTools(session: MCPClientSession): Promise<MCPTool[]> {
  const tools: MCPTool[] = []
  let cursor: string | undefined
  do {
    const page = await session.client.listTools(cursor ? { cursor } : undefined)
    tools.push(...page.tools)
    cursor = page.nextCursor
  } while (cursor)
  return tools
}

/** Resolves with `fallback` as soon as `signal` aborts, leaving `promise` to settle on its own. */
function unlessAborted<T>(promise: Promise<T>, fallback: T, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) return Promise.resolve(fallback)
  return new Promise<T>((resolve, reject) => {
    const abort = () => resolve(fallback)
    signal.addEventListener('abort', abort, { once: true })
    promise
      .finally(() => signal.removeEventListener('abort', abort))
      .then(resolve)
      .catch(reject)
  })
}

/**
 * The external MCP servers direct-API chats use: each enabled connection is connected once and
 * reused for later messages and other chats, reconnected after it changes or drops, and
 * disconnected once nothing has held it for a while. A server that fails is left out of that
 * message and recorded as a diagnostic, so one broken connection never stops the chat; one that
 * timed out waits a minute before it is tried again, and a local command the person declined
 * is not asked about again until its connection changes.
 */
export function createExternalMCPTools({
  connections = () => enabledMCPConnections.value,
  dependencies,
  idleCloseMs = IDLE_CLOSE_MS,
  now = Date.now
}: ExternalMCPToolsOptions = {}): ExternalMCPTools {
  const open = new Map<MCPConnectionID, OpenServer>()
  const failed = new Map<MCPConnectionID, FailedServer>()
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let holders = 0

  function release(id: MCPConnectionID): void {
    const server = open.get(id)
    if (!server) return
    open.delete(id)
    void server.session.then((session) => session?.close()).catch(() => undefined)
  }

  function stopIdleTimer(): void {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = null
  }

  function scheduleIdleClose(): void {
    stopIdleTimer()
    if (holders > 0 || open.size === 0) return
    idleTimer = setTimeout(() => {
      idleTimer = null
      for (const id of open.keys()) release(id)
    }, idleCloseMs)
  }

  function hold(): () => void {
    holders++
    stopIdleTimer()
    let held = true
    return () => {
      if (!held) return
      held = false
      holders--
      scheduleIdleClose()
    }
  }

  /** Remembers a failure that retrying on every message would only repeat. */
  function rememberFailure(connection: MCPConnection, error: unknown): void {
    if (error instanceof TimeoutError) {
      failed.set(connection.id, { connection, until: now() + TIMEOUT_BACKOFF_MS })
    } else if (error instanceof MCPConnectError && error.reason === 'declined') {
      failed.set(connection.id, { connection, until: Number.POSITIVE_INFINITY })
    }
  }

  function backingOff(connection: MCPConnection): boolean {
    const failure = failed.get(connection.id)
    if (!failure) return false
    if (isEqual(failure.connection, connection) && now() < failure.until) return true
    failed.delete(connection.id)
    return false
  }

  /** A session that arrives after its timeout is closed, so no local process is left running. */
  function connectWithin(connection: MCPConnection): Promise<MCPClientSession> {
    // The MCP client loads with the first enabled connection, not with every chat.
    const connecting = import('./connect').then(({ connectMCPClient }) =>
      connectMCPClient(connection, dependencies)
    )
    const limit =
      connection.transport.type === 'stdio' ? STDIO_CONNECT_TIMEOUT_MS : CONNECT_TIMEOUT_MS
    return withTimeout(() => connecting, limit).catch((error: unknown) => {
      void connecting.then((late) => late.close()).catch(() => undefined)
      throw error
    })
  }

  function connect(connection: MCPConnection): OpenServer {
    const server: OpenServer = {
      connection,
      session: connectWithin(connection)
        .then((session) => {
          session.client.onclose = () => {
            if (open.get(connection.id) === server) open.delete(connection.id)
          }
          return session
        })
        .catch((error: unknown) => {
          recordFailure(error)
          rememberFailure(connection, error)
          if (open.get(connection.id) === server) open.delete(connection.id)
          return null
        })
    }
    open.set(connection.id, server)
    return server
  }

  /**
   * The session a call goes to: the open one, or a new one when the server was disconnected
   * since its tools were listed, as when it was idle for long or dropped the connection.
   */
  async function sessionFor(connection: MCPConnection): Promise<MCPClientSession> {
    const current = open.get(connection.id)
    let server = current && isEqual(current.connection, connection) ? current : null
    const stillWanted = connections().some((wanted) => isEqual(wanted, connection))
    if (!server && !current && stillWanted) server = connect(connection)
    const session = await server?.session
    if (!session) throw new Error(`The MCP server “${connection.name}” is not connected.`)
    return session
  }

  /** Each call holds the servers, so a slow one is never cut off by the idle timer. */
  function caller(connection: MCPConnection): Pick<Client, 'callTool'> {
    return {
      async callTool(params, options) {
        const done = hold()
        try {
          const session = await sessionFor(connection)
          return await session.client.callTool(params, options)
        } finally {
          done()
        }
      }
    }
  }

  async function serverTools(server: OpenServer): Promise<MCPServerTools | null> {
    const session = await server.session
    if (!session) return null
    try {
      const tools = await withTimeout(() => listAllMCPTools(session), LIST_TIMEOUT_MS)
      return { connection: server.connection, client: caller(server.connection), tools }
    } catch (error) {
      recordFailure(error)
      rememberFailure(server.connection, error)
      release(server.connection.id)
      return null
    }
  }

  return {
    async tools({ signal, ...toolOptions } = {}) {
      const done = hold()
      try {
        const wanted = connections()
        const wantedIds = new Set(wanted.map((connection) => connection.id))
        for (const id of open.keys()) if (!wantedIds.has(id)) release(id)
        for (const id of failed.keys()) if (!wantedIds.has(id)) failed.delete(id)
        const servers = wanted.flatMap((connection) => {
          const current = open.get(connection.id)
          if (current && isEqual(current.connection, connection)) return [current]
          if (current) release(connection.id)
          return backingOff(connection) ? [] : [connect(connection)]
        })
        const listed = await unlessAborted(Promise.all(servers.map(serverTools)), [], signal)
        return buildMCPChatTools(compact(listed), toolOptions)
      } finally {
        done()
      }
    },
    hold,
    close() {
      stopIdleTimer()
      failed.clear()
      // A server still connecting is closed once it connects; closing does not wait for it.
      for (const id of open.keys()) release(id)
    }
  }
}

let appExternalMCP: ExternalMCPTools | null = null

/**
 * The external MCP servers every direct-API chat in this window shares, so switching chats or
 * models reuses their connections instead of starting another local process for each chat.
 */
export function appExternalMCPTools(): ExternalMCPTools {
  appExternalMCP ??= createExternalMCPTools()
  return appExternalMCP
}
