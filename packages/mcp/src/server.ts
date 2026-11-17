import { randomBytes } from 'node:crypto'
import type { Server as HttpServer } from 'node:http'
import { resolve } from 'node:path'

import type { McpServer } from '@modelcontextprotocol/server'
import type { Hono } from 'hono'
import { WebSocketServer } from 'ws'

import { createAgentBridge, type AgentBridge, type AgentBridgeOptions } from '#mcp/agents/index'
import { isAuthorized } from '#mcp/auth'
import { createBrowserRPCBridge } from '#mcp/browser-rpc'
import { createHonoApp } from '#mcp/server/http-app'
import { createMCPSessionManager } from '#mcp/server/sessions'
import { createServerInstructions } from '#mcp/skill/instructions'
import { createToolDescriptors } from '#mcp/tool/manifest'
import type { ToolPolicy } from '#mcp/tool/metadata'
import { applyToolPolicy } from '#mcp/tool/policy'
import { registerTools, type MCPAgentSession } from '#mcp/tool/registration'
import { scopeRPC, type MCPToolScope } from '#mcp/tool/scope'
import { admittedOrigins } from '#mcp/transport/origins'

import packageJSON from '../package.json' with { type: 'json' }
import { wireConnectionHandling } from './server/connections'
import {
  type ListenerState,
  cleanupDiscovery,
  closeWssGracefully,
  createAppServer,
  startSocketListener,
  teardownListeners,
  tryStartTcp,
  tryWriteDiscovery
} from './server/lifecycle'
import { createUpgradeHandler } from './server/origin'

export const MCP_VERSION: string = packageJSON.version

export { fail, ok, type MCPContent, type MCPResult } from '#mcp/result'

export {
  MCP_AGENT_KINDS,
  registerTools,
  type MCPAgentKind,
  type MCPAgentSession,
  type RegisterToolsOptions,
  type RPCSender
} from '#mcp/tool/registration'

export interface ServerOptions {
  /** TCP port for the HTTP + WebSocket server. Ignored when `withTcp` is false. When set to 0 with `withTcp: true`, binds to an ephemeral port. Defaults to 7600. */
  httpPort?: number
  /** Path to the Unix domain socket. Auto-resolved if omitted. */
  socketPath?: string | null
  /** Whether to also listen on TCP (in addition to the socket). API default is `false`; the CLI passes `true` by default (derived from PORT, default 7600). */
  withTcp?: boolean
  enableEval?: boolean
  /** Tool names omitted from every MCP session. */
  disabledTools?: Iterable<string>
  /** What clients can reach: the whole document (default) or only the user's selection. */
  scope?: MCPToolScope
  mcpRoot?: string | null
  /** Auth token for /mcp and /rpc endpoints. Auto-generated (32-hex) when omitted. Pass null explicitly to disable auth. */
  authToken?: string | null
  corsOrigin?: string | readonly string[] | null
  /**
   * If set, the server starts a grace-period timer while no app is attached.
   * The timer closes the server and removes its discovery file unless an app
   * registers before it expires. A later app disconnect starts a new grace
   * period, which lets app-spawned servers survive brief reloads while still
   * cleaning up after renderer or process crashes. Undefined/0 disables the
   * watchdog — the default, since a bare CLI invocation for manual testing
   * should not self-terminate just because nobody connected yet. The desktop
   * app opts in when it spawns the server.
   */
  appAttachTimeoutMs?: number
  /**
   * Called once the app-attach watchdog has closed the server. A process that
   * exists only for this server passes a shutdown, such as `process.exit`;
   * without one, anything else still holding the event loop keeps it running
   * with no listeners.
   */
  onAppAttachTimeout?: () => void
  /**
   * How long an MCP session may sit without requests before it is closed.
   * Defaults to 15 minutes; 0 disables expiration. An open GET/SSE stream
   * does not count as activity.
   */
  sessionIdleTimeoutMs?: number
  /**
   * How long a tool call waits for the app to register before it fails with
   * APP_NOT_CONNECTED. Defaults to 10 s so a stdio bridge started slightly
   * before the desktop app still succeeds; tests shorten it.
   */
  appWaitTimeoutMs?: number
  /**
   * Turns on the companion's agent bridge (`pairdraw-connect`): pairing with the web app, and
   * finding, installing, signing in to, and starting the coding agents in `ACP_AGENTS` for a
   * paired tab. Off unless set.
   */
  agents?: AgentBridgeOptions
}

export interface ServerHandle {
  /** The Hono app (routes) */
  app: Hono
  /** The primary Node.js HTTP server (socket listener if present, otherwise TCP) */
  server: HttpServer
  /** Resolved socket path (null if not listening on socket) */
  socketPath: string | null
  /** TCP port the server is listening on (0 if TCP is disabled) */
  httpPort: number
  /** Shut down the server: close listeners, remove socket and discovery files */
  close: () => Promise<void>
  /** Issues a one-time pairing code, when the agent bridge is on; otherwise null. */
  issuePairingCode: (() => string) | null
}

function buildServerContext(options: ServerOptions) {
  const httpPort = options.httpPort ?? 7600
  const evalRequestedWithAgents = options.agents !== undefined && (options.enableEval ?? false)
  if (evalRequestedWithAgents) {
    process.stderr.write(
      'Warning: enableEval is ignored while the agent bridge is on; eval stays off.\n'
    )
  }
  const toolPolicy: ToolPolicy = {
    allowEval: (options.enableEval ?? false) && options.agents === undefined,
    disabledTools: [...new Set(options.disabledTools)],
    scope: options.scope ?? 'document'
  }
  const mcpRoot = options.mcpRoot ?? null
  // Auto-generated so all transports require auth by default. Override via PAIRDRAW_MCP_AUTH_TOKEN or authToken option.
  // Pass authToken: null explicitly to disable auth entirely.
  const authToken =
    options.authToken === undefined ? randomBytes(16).toString('hex') : options.authToken
  const corsOrigin = options.corsOrigin ?? null
  const withTcp = options.withTcp ?? false
  const origins = admittedOrigins(corsOrigin, { withAgents: options.agents !== undefined })
  // The bridge learns the TCP port once the listener is up; agents may reach only that `/mcp`.
  const listening = { port: 0 }
  const bridgeOptions = {
    port: () => listening.port,
    version: MCP_VERSION,
    entry: process.argv[1] ?? ''
  }
  const agentBridge = options.agents
    ? createAgentBridge({ ...options.agents, ...bridgeOptions })
    : null
  /** The server's own token, or a tab paired through the agent bridge. */
  const verifyToken = (token: string | null): boolean =>
    isAuthorized(token, authToken) || (agentBridge?.isSession(token) ?? false)
  // Agents' own token reaches only `/mcp`: not the app's bridge or the routes that start programs.
  const verifyMCPToken = (token: string | null): boolean =>
    verifyToken(token) || (agentBridge?.isAgentToken(token) ?? false)

  // Warn if auth is disabled while TCP is active — any local process can
  // interact with the server without authentication. Socket-only transport
  // (PORT=0) is safer because 0o600 permissions restrict access to the
  // same OS user.
  if (authToken === null && withTcp) {
    process.stderr.write(
      `WARNING: MCP server is running without authentication on TCP port ${httpPort}. ` +
        'Any local process can interact with the server. ' +
        'Set PAIRDRAW_MCP_AUTH_TOKEN to enable auth, or use PORT=0 for socket-only transport.\n'
    )
  }

  const mcpSessions = createMCPSessionManager({
    serverVersion: MCP_VERSION,
    sessionIdleTimeoutMs: options.sessionIdleTimeoutMs,
    registerTools: (mcpServer: McpServer, agentSession: MCPAgentSession, onToolSettled) =>
      registerTools(mcpServer, {
        policy: toolPolicy,
        mcpRoot,
        sendRPC: sendToBrowser,
        agentSession,
        onToolSettled
      }),
    instructions: ({ kind }) =>
      createServerInstructions({
        policy: toolPolicy,
        filesystemEnabled: Boolean(mcpRoot),
        agentKind: kind
      }),
    onSessionOpened: ({ id, kind, chat }) => {
      sendToBrowser({ command: 'agent_session_opened', args: { session: id, kind, chat } }).catch(
        () => undefined
      )
    },
    onSessionClosed: (sessionId) => {
      // Best-effort: the app may be gone already, and then it shows no agents anyway.
      sendToBrowser({ command: 'agent_session_closed', args: { session: sessionId } }).catch(
        () => undefined
      )
    }
  })
  const browserRPC = createBrowserRPCBridge({
    authToken,
    authorize: verifyToken,
    onConnectionChange: mcpSessions.notifyToolsChanged,
    appWaitTimeoutMs: options.appWaitTimeoutMs
  })
  // Every call into the app, from MCP sessions and /rpc alike, stays within the scope.
  const sendToBrowser = scopeRPC(browserRPC.sendRPC, toolPolicy.scope)
  const toolDescriptors = applyToolPolicy(createToolDescriptors(mcpRoot !== null), toolPolicy)

  const app = createHonoApp({
    authToken,
    verifyToken,
    verifyMCPToken,
    corsOrigin,
    origins,
    corsAllowed: corsOrigin === null ? null : origins,
    agentBridge,
    // A client limited to the selection reaches no files, as the file tools are left out then.
    fileRoot: mcpRoot !== null && toolPolicy.scope !== 'selection' ? resolve(mcpRoot) : null,
    browserRPC,
    mcpSessions,
    sendToBrowser,
    toolDescriptors,
    version: MCP_VERSION
  })
  const wss = new WebSocketServer({ noServer: true })
  const upgrade = createUpgradeHandler(origins, wss, agentBridge)

  return {
    httpPort,
    withTcp,
    mcpSessions,
    browserRPC,
    sendToBrowser,
    app,
    wss,
    upgrade,
    agentBridge,
    listening,
    authToken,
    disabledTools: toolPolicy.disabledTools,
    scope: toolPolicy.scope
  }
}

/**
 * Unified runtime shutdown: closes browserRPC, clears MCP sessions,
 * terminates WebSocket clients, closes the WSS, and tears down HTTP
 * listeners. Used by both the startup catch block and ServerHandle.close()
 * to ensure no runtime resources (WebSocket, browserRPC, mcpSessions) are
 * left alive.
 */
async function shutdownRuntime(
  browserRPC: ReturnType<typeof createBrowserRPCBridge>,
  mcpSessions: ReturnType<typeof createMCPSessionManager>,
  wss: WebSocketServer,
  state: ListenerState,
  agentBridge: AgentBridge | null
): Promise<void> {
  const errors: unknown[] = []
  try {
    // Agents and sign-ins the companion started end with it.
    await agentBridge?.close()
  } catch (e) {
    errors.push(e)
  }
  try {
    browserRPC.close()
  } catch (e) {
    errors.push(e)
  }
  try {
    await mcpSessions.clear()
  } catch (e) {
    errors.push(e)
  }
  try {
    await closeWssGracefully(wss)
  } catch (e) {
    errors.push(e)
  }
  try {
    await teardownListeners(state)
  } catch (e) {
    errors.push(e)
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'Multiple shutdown errors')
}

function buildHandle(
  app: Hono,
  wss: WebSocketServer,
  agentBridge: AgentBridge | null,
  browserRPC: ReturnType<typeof createBrowserRPCBridge>,
  mcpSessions: ReturnType<typeof createMCPSessionManager>,
  state: ListenerState,
  resolvedSocketPath: string | null,
  actualHttpPort: number,
  authToken: string | null,
  startedAt: string
): ServerHandle {
  // Promise-based lock ensures idempotency even under concurrent calls:
  // the first call creates the teardown promise; subsequent calls return
  // the same promise. JavaScript's event loop guarantees no preemption
  // between the guard check and the assignment.
  let closePromise: Promise<void> | null = null

  async function close() {
    if (closePromise) return closePromise
    closePromise = (async () => {
      const errors: unknown[] = []
      try {
        // Stop advertising this process before the slower WebSocket grace
        // period. This also makes signal-driven shutdown resilient when a
        // parent process exits before all clients finish closing.
        await cleanupDiscovery(authToken, resolvedSocketPath, actualHttpPort, startedAt)
      } catch (error) {
        errors.push(error)
      }
      try {
        await shutdownRuntime(browserRPC, mcpSessions, wss, state, agentBridge)
      } catch (error) {
        errors.push(error)
      }
      if (errors.length === 1) throw errors[0]
      if (errors.length > 1) throw new AggregateError(errors, 'Multiple shutdown errors')
    })()
    return closePromise
  }

  const primary = state.socketResult?.server ?? state.tcpResult?.server ?? createAppServer(app)
  return {
    app,
    server: primary,
    socketPath: resolvedSocketPath,
    httpPort: actualHttpPort,
    close,
    issuePairingCode: agentBridge ? agentBridge.issuePairingCode : null
  }
}

export async function startServer(options: ServerOptions = {}): Promise<ServerHandle> {
  validateTimeoutOption('appAttachTimeoutMs', options.appAttachTimeoutMs)
  validateTimeoutOption('appWaitTimeoutMs', options.appWaitTimeoutMs)
  validateTimeoutOption('sessionIdleTimeoutMs', options.sessionIdleTimeoutMs)
  const ctx = buildServerContext(options)

  // Wire shared connection handling BEFORE starting listeners so that
  // any client connecting during startup is handled immediately.
  wireConnectionHandling(ctx.wss, ctx.browserRPC)

  const state: ListenerState = { socketResult: null, tcpResult: null }
  let startedAt: string
  try {
    state.socketResult = await startSocketListener(ctx.app, ctx.upgrade, options.socketPath ?? null)
    state.tcpResult = ctx.withTcp
      ? await tryStartTcp(ctx.app, ctx.upgrade, ctx.httpPort, state)
      : null
    ctx.listening.port = state.tcpResult?.port ?? 0
    const resolvedSocketPath = state.socketResult?.resolvedPath ?? null
    const actualHttpPort = state.tcpResult?.port ?? 0

    if (!resolvedSocketPath && !actualHttpPort) {
      throw new Error(
        'MCP server has no active listeners (both socket and TCP are unavailable). ' +
          'Ensure Unix domain sockets are supported on this platform or enable TCP with withTcp: true.'
      )
    }

    startedAt = await tryWriteDiscovery(
      resolvedSocketPath,
      actualHttpPort,
      ctx.authToken,
      MCP_VERSION,
      ctx.disabledTools,
      ctx.scope,
      state
    )
  } catch (err) {
    // Tear down any listeners that started before the failure, then close
    // all resources so nothing leaks when startServer rejects.
    await shutdownRuntime(ctx.browserRPC, ctx.mcpSessions, ctx.wss, state, ctx.agentBridge).catch(
      () => undefined
    )
    throw err
  }

  const resolvedSocketPath = state.socketResult?.resolvedPath ?? null
  const actualHttpPort = state.tcpResult?.port ?? 0

  const handle = buildHandle(
    ctx.app,
    ctx.wss,
    ctx.agentBridge,
    ctx.browserRPC,
    ctx.mcpSessions,
    state,
    resolvedSocketPath,
    actualHttpPort,
    ctx.authToken,
    startedAt
  )

  armAppAttachWatchdog(
    options.appAttachTimeoutMs,
    ctx.browserRPC,
    handle,
    options.onAppAttachTimeout
  )

  return handle
}

const MAX_TIMER_MS = 2_147_483_647

function validateTimeoutOption(name: string, timeoutMs: number | undefined): void {
  if (timeoutMs === undefined) return
  if (!Number.isSafeInteger(timeoutMs)) {
    throw new RangeError(`${name} must be a safe integer`)
  }
  if (timeoutMs < 0 || timeoutMs > MAX_TIMER_MS) {
    throw new RangeError(`${name} must be in the range 0–${MAX_TIMER_MS}`)
  }
}

/**
 * Closes an app-spawned server after it remains unattached for the configured
 * grace period. Registering an app cancels the pending shutdown; disconnecting
 * starts a fresh grace period so renderer reloads can reconnect without
 * leaving a permanently orphaned process behind.
 */
function armAppAttachWatchdog(
  timeoutMs: number | undefined,
  browserRPC: ReturnType<typeof createBrowserRPCBridge>,
  handle: ServerHandle,
  onTimeout: (() => void) | undefined
): void {
  if (timeoutMs === undefined || timeoutMs === 0) return

  let timer: ReturnType<typeof setTimeout> | null = null
  let closing = false
  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }
  const armTimer = () => {
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      if (browserRPC.isConnected() || closing) return
      closing = true
      unsubscribe()
      // The reason a server the app owned went away is otherwise invisible: it wrote nothing
      // else to stderr, and its discovery file and socket are gone with it.
      process.stderr.write(`[MCP] No app attached for ${timeoutMs} ms; closing the server.\n`)
      void handle
        .close()
        .then(() => onTimeout?.())
        .catch((e) => {
          console.error('[MCP] Watchdog: failed to close orphaned (no_app) server:', e)
        })
    }, timeoutMs)
    timer.unref()
  }
  const unsubscribe = browserRPC.subscribeConnectionChange((connected) => {
    if (connected) clearTimer()
    else armTimer()
  })
}
