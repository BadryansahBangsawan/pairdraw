import { Hono, type Context, type Next } from 'hono'
import { cors } from 'hono/cors'

import { MCP_AGENT_HEADER, MCP_CHAT_HEADER } from '@pairdraw/core/constants'

import type { AgentBridge } from '#mcp/agents/index'
import { bearerToken, mcpRequestToken } from '#mcp/auth'
import type { createBrowserRPCBridge } from '#mcp/browser-rpc'
import * as httpOptions from '#mcp/http-options'
import type { RPCJSONObject } from '#mcp/json'
import { registerFileRoutes } from '#mcp/server/files'
import {
  type createMCPSessionManager,
  MCP_SESSION_EVICT_IDLE_MS,
  MCP_SESSION_LIMIT,
  sessionOpener
} from '#mcp/server/sessions'
import type { ToolDescriptor } from '#mcp/tool/metadata'

import { mcpInstallCommand } from './install-command'
import { originGuard } from './origin'

const MCP_METHODS: readonly string[] = ['GET', 'POST', 'DELETE']

/** Set up Hono routes: /health, /rpc, /files, /mcp */
export function createHonoApp(options: {
  authToken: string | null
  /** Whether a token reaches the app's bridge, `/rpc`, and `/files`: the server's own, or a paired tab's. */
  verifyToken: (token: string | null) => boolean
  /** Whether a token reaches `/mcp`: also the agent token a paired tab hands its agents. */
  verifyMCPToken: (token: string | null) => boolean
  corsOrigin: string | readonly string[] | null
  /** Origins whose pages may call the server; requests without an Origin come from programs. */
  origins: readonly string[]
  /** The filtered list `cors()` answers with; never carries a stray `*` when the bridge is on. */
  corsAllowed: readonly string[] | null
  agentBridge: AgentBridge | null
  /** The root `/files` reads and writes inside, or null to leave the route out. */
  fileRoot: string | null
  browserRPC: ReturnType<typeof createBrowserRPCBridge>
  mcpSessions: ReturnType<typeof createMCPSessionManager>
  sendToBrowser: (msg: RPCJSONObject) => Promise<unknown>
  toolDescriptors: ToolDescriptor[]
  version: string
}): Hono {
  const { authToken, corsOrigin, corsAllowed, fileRoot, browserRPC, mcpSessions, sendToBrowser } =
    options
  const { toolDescriptors, verifyToken, verifyMCPToken, origins, agentBridge } = options

  const app = new Hono()

  app.use('*', originGuard(origins))

  if (corsOrigin) {
    const corsOrigins =
      corsAllowed ?? (typeof corsOrigin === 'string' ? [corsOrigin] : [...corsOrigin])
    app.use(
      '*',
      cors({
        origin: [...corsOrigins],
        allowMethods: httpOptions.MCP_CORS_METHODS,
        allowHeaders: httpOptions.MCP_CORS_HEADERS,
        exposeHeaders: httpOptions.MCP_EXPOSED_HEADERS
      })
    )
  }

  app.get('/health', async (c) => {
    const provided = bearerToken(c.req.header('authorization'))
    const canInspectConfiguration = verifyMCPToken(provided)
    return c.json({
      status: browserRPC.isConnected() ? 'ok' : 'no_app',
      version: options.version,
      installCommand: await mcpInstallCommand(options.version),
      authRequired: authToken !== null,
      // Tells the app it reports agent_session_opened, so a chat may wait for its agent.
      agentSessionEvents: true,
      ...(canInspectConfiguration ? { tools: toolDescriptors } : {})
    })
  })

  const requireToken = async (c: Context, next: Next) => {
    // When authToken is null (operator explicitly disabled auth), skip token check —
    // the Unix socket or localhost TCP already restricts access to local processes.
    if (!verifyToken(bearerToken(c.req.header('authorization')))) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    return next()
  }

  app.use('/rpc', requireToken)

  if (fileRoot !== null) {
    app.use('/files/*', requireToken)
    registerFileRoutes(app, fileRoot)
  }

  // Errors from sendToBrowser surface as 502, including a disconnected app (formerly 503).
  app.post('/rpc', httpOptions.limitBody, async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ error: 'Invalid request body' }, 400)
    }
    try {
      const result = await sendToBrowser(body as RPCJSONObject)
      return c.json(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return c.json({ ok: false, error: msg }, 502)
    }
  })

  const requireMCPToken = async (c: Context, next: Next) => {
    const token = mcpRequestToken(c.req.header('authorization'), c.req.header('x-mcp-token'))
    return verifyMCPToken(token) ? next() : c.json({ error: 'Unauthorized' }, 401)
  }

  app.all('/mcp', requireMCPToken, httpOptions.limitBody, async (c) => {
    if (!MCP_METHODS.includes(c.req.method)) {
      return c.json(
        { error: 'Method not allowed' },
        { status: 405, headers: { Allow: MCP_METHODS.join(', ') } }
      )
    }
    const sessionId = c.req.header('mcp-session-id') ?? undefined
    if (sessionId) {
      // Never allocate a session for an unknown ID: DELETE or a stale client
      // would burn a slot it can never use.
      const existing = mcpSessions.getExistingTransport(sessionId)
      if ('error' in existing) {
        if (existing.error === 'closed') {
          return c.json({ error: 'MCP server is shutting down' }, 503)
        }
        return c.json({ error: 'MCP session not found' }, 404)
      }
      if (c.req.method !== 'DELETE') return existing.handleRequest(c.req.raw)
      try {
        return await existing.handleRequest(c.req.raw)
      } finally {
        await mcpSessions.deleteSession(sessionId)
      }
    }
    // Only an initializing POST may start a session.
    if (c.req.method !== 'POST') {
      return c.json({ error: 'Missing MCP session id' }, 400)
    }
    const transport = await mcpSessions.resolveTransport(
      undefined,
      sessionOpener(c.req.header(MCP_AGENT_HEADER), c.req.header(MCP_CHAT_HEADER))
    )
    if ('error' in transport) {
      if (transport.error === 'closed') {
        return c.json({ error: 'MCP server is shutting down' }, 503)
      }
      // The refusal names what the caller ran into, so a client can tell why it was turned away
      // and when to come back.
      return c.json(
        {
          error: `The server holds ${MCP_SESSION_LIMIT} MCP sessions at once; close one with DELETE, or wait for one left idle for ${MCP_SESSION_EVICT_IDLE_MS / 1000} seconds to be released.`,
          limit: MCP_SESSION_LIMIT,
          retryAfterSeconds: 5
        },
        { status: 503, headers: { 'Retry-After': '5' } }
      )
    }
    return transport.handleRequest(c.req.raw)
  })

  agentBridge?.routes(app)

  return app
}
