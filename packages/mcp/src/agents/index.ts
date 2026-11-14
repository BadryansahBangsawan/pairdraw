import type { ChildProcess } from 'node:child_process'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'

import type { Hono, MiddlewareHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import * as v from 'valibot'
import { WebSocketServer, type WebSocket } from 'ws'

import { bearerToken } from '#mcp/auth'
import { getAgentWorkspacePath } from '#mcp/transport/paths'

import { pipeAgent, type AgentProcessContext } from './acp'
import { createACPFilter, isLoopbackMCP } from './filter'
import { installWithNpm, type PackageInstaller } from './install'
import { ensureWorkspace, lookupAgents } from './lookup'
import { createPairing, type PairingOptions, type TrustedSession } from './pairing'
import { augmentPath } from './path'
import { terminate } from './process'
import { COMPANION_AGENTS, findCompanionAgent, type CompanionAgent } from './registry'
import { devAgentSessionEnvSchema, pairRequestSchema } from './schema'
import { runSignIn } from './sign-in'
import { authenticate, CLOSE_CODES, keepAlive } from './socket'

/** Frames an agent's ACP stream may carry; prompts can hold images. */
const ACP_MAX_FRAME_BYTES = 16 * 1024 * 1024
const CONTROL_MAX_FRAME_BYTES = 64 * 1024
const MAX_REQUEST_BYTES = 1024
/** Agents and sign-ins running at once, across every paired tab. */
const MAX_AGENT_PROCESSES = 8
/** Sockets that may wait for their first message at once, so unpaired clients cannot pile up. */
const MAX_UNAUTHENTICATED_SOCKETS = 16

export interface AgentBridgeOptions {
  /** Where agents start, created on first use; defaults to a folder beside the discovery file. */
  workspace?: string
  /** The agents the bridge may start. Defaults to `ACP_AGENTS`; tests pass stand-ins. */
  registry?: readonly CompanionAgent[]
  /** The PATH agents are found on and started with; defaults to an augmented `PATH`. */
  searchPath?: string
  /** Installs adapter packages; defaults to `npm install --global`. */
  installer?: PackageInstaller
  /** Code and session lifetimes; trusted sessions come from `trustedSessions`. */
  pairing?: Omit<PairingOptions, 'trusted'>
  /**
   * Sessions that need no `/pair`, for the tab of the process that started the server
   * (`devAgentBridgeFromEnv`). They never expire and cannot be revoked.
   */
  trustedSessions?: readonly TrustedSession[]
  /** The TCP port the server listens on, which is where the companion's own MCP endpoint is. */
  port?: () => number
  /** Told each time a tab pairs, so the companion can say so in its terminal. */
  onPaired?: () => void
}

const AGENT_SOCKET_PATH = /^\/agents\/([\w-]{1,64})\/(acp|sign-in)$/

/**
 * The bridge `bun run dev` asks the MCP server it starts for: `PAIRDRAW_MCP_AGENTS=1`, with its
 * tab's session in `PAIRDRAW_MCP_AGENT_SESSION` and `PAIRDRAW_MCP_AGENT_TOKEN`. Null without
 * them or when they are malformed, and the server then has no bridge. The tokens stay in this
 * process: the discovery file never holds them.
 */
export function devAgentBridgeFromEnv(
  env: NodeJS.ProcessEnv = process.env
): AgentBridgeOptions | null {
  if (env.PAIRDRAW_MCP_AGENTS !== '1') return null
  const session = v.safeParse(devAgentSessionEnvSchema, env)
  return session.success ? { trustedSessions: [session.output] } : null
}

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`)
}

/**
 * The companion's agent bridge: pairing, finding and installing agents, and starting them for a
 * paired tab. Every route and socket here needs a session token from `/pair`; the MCP server's
 * own token, which local MCP clients read from the discovery file, does not start programs.
 */
export function createAgentBridge(
  options: AgentBridgeOptions & { version: string; entry: string }
) {
  const registry = options.registry ?? COMPANION_AGENTS
  const searchPath = options.searchPath ?? augmentPath(process.env.PATH ?? '')
  const installer = options.installer ?? installWithNpm
  const pairing = createPairing({ ...options.pairing, trusted: options.trustedSessions })
  const children = new Set<ChildProcess>()
  const signIns = new Map<string, WebSocket>()
  const acpSockets = new WebSocketServer({ noServer: true, maxPayload: ACP_MAX_FRAME_BYTES })
  const controlSockets = new WebSocketServer({
    noServer: true,
    maxPayload: CONTROL_MAX_FRAME_BYTES
  })
  let installing = false
  let closed = false
  let reserved = 0
  let unauthenticated = 0
  let workspacePath: Promise<string> | null = null

  function track(child: ChildProcess) {
    children.add(child)
    child.once('exit', () => children.delete(child))
    child.once('error', () => children.delete(child))
  }

  /**
   * Holds a place for a process before anything is awaited, so sockets authenticating at once
   * cannot all pass the limit. The place is released once the process is tracked, or not started.
   */
  function reserve(): (() => void) | null {
    if (children.size + reserved >= MAX_AGENT_PROCESSES) return null
    reserved++
    let released = false
    return () => {
      if (released) return
      released = true
      reserved--
    }
  }

  function workspace(): Promise<string> {
    workspacePath ??= (async () =>
      ensureWorkspace(options.workspace ?? (await getAgentWorkspacePath())))()
    // A failed attempt, such as a folder that could not be created, is tried again next time.
    workspacePath.catch(() => {
      workspacePath = null
    })
    return workspacePath
  }

  async function processContext(): Promise<AgentProcessContext> {
    return { workspace: await workspace(), searchPath, track }
  }

  function routes(app: Hono) {
    const limit = bodyLimit({
      maxSize: MAX_REQUEST_BYTES,
      onError: (c) => c.json({ error: 'Request is too large' }, 413)
    })

    app.post('/pair', limit, async (c) => {
      const body = v.safeParse(
        v.pipe(v.string(), v.parseJson(), pairRequestSchema),
        await c.req.text()
      )
      if (!body.success) return c.json({ error: 'Invalid request body' }, 400)
      const result = pairing.exchange(body.output.code)
      if (result.ok) {
        options.onPaired?.()
        return c.json({
          token: result.token,
          agentToken: result.agentToken,
          version: options.version
        })
      }
      if (result.reason === 'rate-limited') {
        return c.json(
          { error: 'Too many attempts' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
      return c.json({ error: 'The link expired or was already used' }, 401)
    })

    const requireSession: MiddlewareHandler = async (c, next) => {
      if (!pairing.isSession(bearerToken(c.req.header('authorization')))) {
        return c.json({ error: 'Unauthorized' }, 401)
      }
      return next()
    }
    app.use('/companion', requireSession)
    app.use('/agents', requireSession)
    app.use('/agents/*', requireSession)
    app.use('/pair/revoke', requireSession)

    // The tab signs out, as when the person disconnects it; its tokens stop working at once.
    app.post('/pair/revoke', limit, (c) => {
      const token = bearerToken(c.req.header('authorization'))
      if (token) pairing.revoke(token)
      return c.body(null, 204)
    })

    app.get('/companion', async (c) =>
      c.json({ version: options.version, workspace: await workspace() })
    )

    app.get('/agents', async (c) =>
      c.json(
        await lookupAgents(registry, { searchPath, version: options.version, entry: options.entry })
      )
    )

    app.post('/agents/:id/install', limit, async (c) => {
      const agent = findCompanionAgent(registry, c.req.param('id'))
      if (!agent) return c.json({ error: 'Unknown agent' }, 404)
      if (!agent.adapterPackage)
        return c.json({ error: 'This agent has no adapter to install' }, 400)
      if (installing) return c.json({ error: 'Another installation is running' }, 409)
      installing = true
      try {
        await installer(agent.adapterPackage, searchPath, await workspace())
        return c.json({ ok: true })
      } catch {
        return c.json({ error: 'The installation failed' }, 500)
      } finally {
        installing = false
      }
    })
  }

  async function serveSocket(ws: WebSocket, agent: CompanionAgent, kind: 'acp' | 'sign-in') {
    keepAlive(ws)
    unauthenticated++
    let authenticated: boolean
    try {
      authenticated = await authenticate(ws, pairing.isSession)
    } finally {
      unauthenticated--
    }
    if (!authenticated) return
    if (closed) {
      ws.close(1001, 'Companion is shutting down')
      return
    }
    if (kind === 'sign-in' && signIns.has(agent.id)) {
      ws.close(CLOSE_CODES.conflict, 'A sign-in is already running')
      return
    }
    const release = reserve()
    if (!release) {
      ws.close(CLOSE_CODES.busy, 'Too many agents are running')
      return
    }
    try {
      if (kind === 'sign-in') {
        signIns.set(agent.id, ws)
        ws.once('close', () => signIns.delete(agent.id))
        runSignIn(ws, agent, await processContext())
        return
      }
      const context = await processContext()
      const filter = createACPFilter({
        workspace: context.workspace,
        isOwnMCP: (url) => isLoopbackMCP(url, options.port?.() ?? 0)
      })
      pipeAgent(ws, agent, { ...context, filter })
    } finally {
      // The process, if it started, is tracked by now; otherwise its place is free again.
      release()
    }
  }

  /** Takes upgrades under `/agents/`; returns false for other paths. The caller checked Origin. */
  function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    if (!pathname.startsWith('/agents/')) return false
    const match = AGENT_SOCKET_PATH.exec(pathname)
    const agent = match ? findCompanionAgent(registry, match[1]) : undefined
    if (!match || !agent || closed) {
      rejectUpgrade(socket, 404, 'Not Found')
      return true
    }
    if (unauthenticated >= MAX_UNAUTHENTICATED_SOCKETS) {
      rejectUpgrade(socket, 503, 'Service Unavailable')
      return true
    }
    const kind = match[2] === 'acp' ? 'acp' : 'sign-in'
    const server = kind === 'acp' ? acpSockets : controlSockets
    server.handleUpgrade(request, socket, head, (ws) => {
      void serveSocket(ws, agent, kind).catch(() => {
        if (ws.readyState === ws.OPEN) ws.close(CLOSE_CODES.failed, 'Agent bridge failed')
      })
    })
    return true
  }

  /** Stops every agent and sign-in and closes their sockets. */
  async function close(): Promise<void> {
    closed = true
    for (const server of [acpSockets, controlSockets]) {
      for (const ws of server.clients) ws.terminate()
      server.close()
    }
    await Promise.all([...children].map((child) => terminate(child)))
    children.clear()
  }

  return {
    routes,
    handleUpgrade,
    close,
    issuePairingCode: pairing.issueCode,
    isSession: pairing.isSession,
    isAgentToken: pairing.isAgentToken
  }
}

export type AgentBridge = ReturnType<typeof createAgentBridge>
