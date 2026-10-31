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
import { installWithNpm, type PackageInstaller } from './install'
import { ensureWorkspace, lookupAgents } from './lookup'
import { createPairing, type PairingOptions } from './pairing'
import { augmentPath } from './path'
import { terminate } from './process'
import { COMPANION_AGENTS, findCompanionAgent, type CompanionAgent } from './registry'
import { pairRequestSchema } from './schema'
import { runSignIn } from './sign-in'
import { authenticate, CLOSE_CODES, keepAlive } from './socket'

/** Frames an agent's ACP stream may carry; prompts can hold images. */
const ACP_MAX_FRAME_BYTES = 16 * 1024 * 1024
const CONTROL_MAX_FRAME_BYTES = 64 * 1024
const MAX_REQUEST_BYTES = 1024
/** Agents running at once, across every paired tab. */
const MAX_AGENT_PROCESSES = 8

export interface AgentBridgeOptions {
  /** Where agents start, created on first use; defaults to a folder beside the discovery file. */
  workspace?: string
  /** The agents the bridge may start. Defaults to `ACP_AGENTS`; tests pass stand-ins. */
  registry?: readonly CompanionAgent[]
  /** The PATH agents are found on and started with; defaults to an augmented `PATH`. */
  searchPath?: string
  /** Installs adapter packages; defaults to `npm install --global`. */
  installer?: PackageInstaller
  pairing?: PairingOptions
}

const AGENT_SOCKET_PATH = /^\/agents\/([\w-]{1,64})\/(acp|sign-in)$/

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
  const pairing = createPairing(options.pairing)
  const children = new Set<ChildProcess>()
  const signIns = new Map<string, WebSocket>()
  const acpSockets = new WebSocketServer({ noServer: true, maxPayload: ACP_MAX_FRAME_BYTES })
  const controlSockets = new WebSocketServer({
    noServer: true,
    maxPayload: CONTROL_MAX_FRAME_BYTES
  })
  let installing = false
  let closed = false

  function track(child: ChildProcess) {
    children.add(child)
    child.once('exit', () => children.delete(child))
    child.once('error', () => children.delete(child))
  }

  async function workspace(): Promise<string> {
    return ensureWorkspace(options.workspace ?? (await getAgentWorkspacePath()))
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
      if (result.ok) return c.json({ token: result.token, version: options.version })
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
        await installer(agent.adapterPackage, searchPath)
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
    if (!(await authenticate(ws, pairing.isSession))) return
    if (closed) {
      ws.close(1001, 'Companion is shutting down')
      return
    }
    if (kind === 'sign-in') {
      if (signIns.has(agent.id)) {
        ws.close(CLOSE_CODES.conflict, 'A sign-in is already running')
        return
      }
      signIns.set(agent.id, ws)
      ws.once('close', () => signIns.delete(agent.id))
      runSignIn(ws, agent, await processContext())
      return
    }
    if (children.size >= MAX_AGENT_PROCESSES) {
      ws.close(CLOSE_CODES.busy, 'Too many agents are running')
      return
    }
    pipeAgent(ws, agent, await processContext())
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
    isSession: pairing.isSession
  }
}

export type AgentBridge = ReturnType<typeof createAgentBridge>
