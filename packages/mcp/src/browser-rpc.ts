import { randomUUID } from 'node:crypto'

import * as v from 'valibot'
import type { WebSocket } from 'ws'

import { isAuthorized } from '#mcp/auth'
import type { RPCJSONObject } from '#mcp/json'
import type { PendingRequest } from '#mcp/rpc-types'

const RPC_TIMEOUT = 20_000
const APP_WAIT_TIMEOUT = 10_000

const APP_NOT_CONNECTED_MESSAGE =
  'OpenPencil app is not connected. STOP and tell the user: "The OpenPencil desktop app is not running, no document is open, or the desktop app is connected to a different MCP server. Please start OpenPencil, open a document, and try again." Do NOT attempt to start the app yourself or retry automatically.'

type BrowserRPCBridgeOptions = {
  authToken: string | null
  /** Decides which tokens may register or authenticate; defaults to `authToken` alone. */
  authorize?: (token: string | null) => boolean
  onConnectionChange: () => void
  /** How long an RPC waits for the app to register before failing with APP_NOT_CONNECTED. Defaults to 10 s. */
  appWaitTimeoutMs?: number
}

type ConnectionListener = (connected: boolean) => void

/** Any JSON object; the per-type schemas below run only once its `type` is known. */
const browserEnvelopeSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.custom<Record<string, unknown>>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
  )
)

const handshakeMessageSchema = v.looseObject({
  token: v.optional(v.nullable(v.string())),
  /** The editor window's label; a register without one is the legacy single-window app. */
  window: v.optional(v.nullable(v.string()))
})

const focusMessageSchema = v.looseObject({ type: v.literal('focus') })

const requestMessageSchema = v.looseObject({
  type: v.literal('request'),
  id: v.pipe(v.string(), v.nonEmpty())
})

const responseMessageSchema = v.looseObject({
  type: v.literal('response'),
  id: v.pipe(v.string(), v.nonEmpty()),
  ok: v.optional(v.boolean()),
  error: v.optional(v.string())
})

type BrowserMessage =
  | v.InferOutput<typeof requestMessageSchema>
  | v.InferOutput<typeof responseMessageSchema>

function stripEnvelope(msg: BrowserMessage): Record<string, unknown> {
  const { type: _type, id: _id, ...body } = msg
  return body
}

function responsePayload(result: unknown): RPCJSONObject {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result as RPCJSONObject
  }
  return { result }
}

function sendJSON(ws: WebSocket, body: Record<string, unknown>) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(body))
}

function createSettler<T>(resolve: (value: T) => void, reject: (error: Error) => void) {
  let settled = false
  return {
    resolve: (value: T) => {
      if (settled) return
      settled = true
      resolve(value)
    },
    reject: (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    },
    isSettled: () => settled
  }
}

export function createBrowserRPCBridge({
  authToken,
  authorize = (token) => isAuthorized(token, authToken),
  onConnectionChange,
  appWaitTimeoutMs = APP_WAIT_TIMEOUT
}: BrowserRPCBridgeOptions) {
  const pending = new Map<string, PendingRequest & { ws: WebSocket }>()
  const clients = new Set<WebSocket>()
  const connectionWaiters = new Set<PendingRequest>()
  // Track which WebSocket clients have authenticated via a valid
  // register message. Unauthenticated clients can only send register;
  // all other message types (request, response) are rejected.
  const authenticatedClients = new Set<WebSocket>()
  const connectionListeners = new Set<ConnectionListener>()
  /**
   * The editor windows, by socket, in registration order. Every window registers its own
   * connection, so a second window must not displace the first; a reconnect of the same window
   * does replace its old socket.
   */
  const browsers = new Map<WebSocket, string>()
  /** The window that last gained focus; tool calls go there until another window takes focus. */
  let focusedBrowser: WebSocket | null = null
  let bridgeClosed = false

  function isOpen(ws: WebSocket): boolean {
    return ws.readyState === ws.OPEN
  }

  function isConnected(): boolean {
    return [...browsers.keys()].some(isOpen)
  }

  /**
   * The window a tool call goes to: the last focused one. Before any window reports focus, the
   * only connected window answers; with several, the most recently registered does, so a call
   * never waits for a focus event that may not come.
   */
  function targetBrowser(): WebSocket | null {
    if (focusedBrowser && browsers.has(focusedBrowser) && isOpen(focusedBrowser)) {
      return focusedBrowser
    }
    if (browsers.size === 1) {
      const [only] = browsers.keys()
      return only && isOpen(only) ? only : null
    }
    let latest: WebSocket | null = null
    for (const ws of browsers.keys()) if (isOpen(ws)) latest = ws
    return latest
  }

  function notifyConnectionChange() {
    onConnectionChange()
    const connected = isConnected()
    for (const listener of connectionListeners) listener(connected)
  }

  function subscribeConnectionChange(listener: ConnectionListener): () => void {
    connectionListeners.add(listener)
    listener(isConnected())
    return () => connectionListeners.delete(listener)
  }

  function notifyConnectionWaiters() {
    for (const waiter of connectionWaiters) {
      clearTimeout(waiter.timer)
      waiter.resolve(undefined)
    }
    connectionWaiters.clear()
  }

  function rejectConnectionWaiters(reason: string) {
    for (const waiter of connectionWaiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error(reason))
    }
    connectionWaiters.clear()
  }

  function waitForConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let waiter: PendingRequest | null = null

      const timer = setTimeout(() => {
        if (waiter) connectionWaiters.delete(waiter)
        reject(new Error(APP_NOT_CONNECTED_MESSAGE))
      }, appWaitTimeoutMs)

      waiter = {
        resolve: () => {
          clearTimeout(timer)
          resolve()
        },
        reject: (error: Error) => {
          clearTimeout(timer)
          reject(error)
        },
        timer
      }
      // Add the waiter BEFORE checking browser state to avoid a lost-wakeup
      // race: if the browser registers between sendRPC's initial check and
      // this point, notifyConnectionWaiters() will have already fired and
      // cleared the set. Without this re-check, the waiter would stall for
      // appWaitTimeoutMs even though the browser is connected.
      connectionWaiters.add(waiter)
      if (isConnected()) {
        waiter.resolve(undefined)
        connectionWaiters.delete(waiter)
      }
    })
  }

  function rejectAllPending(reason: string) {
    for (const [, req] of pending) {
      clearTimeout(req.timer)
      req.reject(new Error(reason))
    }
    pending.clear()
  }

  /** A closed window's requests cannot answer any more; other windows' calls keep waiting. */
  function rejectPendingFor(ws: WebSocket, reason: string) {
    for (const [id, req] of pending) {
      if (req.ws !== ws) continue
      clearTimeout(req.timer)
      req.reject(new Error(reason))
      pending.delete(id)
    }
  }

  function sendRegisterPrompt(ws: WebSocket) {
    // Send a prompt inviting the client to register as the browser.
    // IMPORTANT: Do NOT include the auth token here. On TCP, any local
    // process can connect via WebSocket — sending the secret token would
    // leak credentials to unauthenticated clients. The legitimate browser
    // app already knows the token (from the discovery file or Vite env)
    // and sends it proactively in its ws.onopen handler. The token field
    // is set to null to signal that auth is required without revealing
    // the secret. When auth is disabled (authToken === null), null is
    // still correct — it means "no token needed."
    sendJSON(ws, { type: 'register', token: null })
  }

  function broadcastRegisterPrompt() {
    for (const client of clients) sendRegisterPrompt(client)
  }

  function sendRPC(body: Record<string, unknown>): Promise<unknown> {
    if (bridgeClosed) return Promise.reject(new Error('Server shutting down'))
    return new Promise((resolve, reject) => {
      const doSend = () => {
        const ws = targetBrowser()
        if (!ws) {
          reject(new Error(APP_NOT_CONNECTED_MESSAGE))
          return
        }
        const id = randomUUID()
        const settle = createSettler(resolve, reject)
        const timer = setTimeout(() => {
          pending.delete(id)
          settle.reject(new Error(`RPC timeout (${Math.round(RPC_TIMEOUT / 1000)}s)`))
        }, RPC_TIMEOUT)
        pending.set(id, { resolve: settle.resolve, reject: settle.reject, timer, ws })
        try {
          ws.send(JSON.stringify({ ...body, type: 'request', id }))
        } catch (e) {
          clearTimeout(timer)
          pending.delete(id)
          if (!settle.isSettled()) {
            settle.reject(e instanceof Error ? e : new Error(String(e)))
          }
        }
      }

      if (targetBrowser()) {
        doSend()
      } else {
        void waitForConnection().then(doSend).catch(reject)
      }
    })
  }

  async function handleClientRequest(
    ws: WebSocket,
    msg: v.InferOutput<typeof requestMessageSchema>
  ) {
    try {
      const result = await sendRPC(stripEnvelope(msg))
      sendJSON(ws, { ...responsePayload(result), type: 'response', id: msg.id, ok: true })
    } catch (e) {
      sendJSON(ws, {
        type: 'response',
        id: msg.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }

  /**
   * Registers an editor window. A window is identified by its label: the same window reconnecting
   * replaces its old socket and rejects only its own in-flight calls, while a second window keeps
   * the first connected.
   */
  function registerBrowser(ws: WebSocket, token: string | null, window: string) {
    if (bridgeClosed) return
    if (!authorize(token)) {
      ws.close()
      return
    }
    // Mark this client as authenticated — it can now send requests.
    authenticatedClients.add(ws)
    for (const [previous, label] of browsers) {
      if (label !== window || previous === ws) continue
      // Reject in-flight requests to this window's old socket. Without this, pending requests
      // sit in the pending map until RPC_TIMEOUT (20s), because handleClose for the old socket
      // no longer finds its label once this connection takes it.
      rejectPendingFor(previous, 'Browser reconnected')
      browsers.delete(previous)
      authenticatedClients.delete(previous)
      if (focusedBrowser === previous) focusedBrowser = ws
      if (isOpen(previous)) previous.close()
    }
    browsers.set(ws, window)
    notifyConnectionWaiters()
    notifyConnectionChange()
    broadcastRegisterPrompt()
  }

  function handleBrowserResponse(msg: v.InferOutput<typeof responseMessageSchema>, ws: WebSocket) {
    const req = pending.get(msg.id)
    // Only the window a call was sent to may answer it.
    if (!req || req.ws !== ws) return
    pending.delete(msg.id)
    clearTimeout(req.timer)
    if (msg.ok === false) {
      req.reject(new Error(msg.error ?? 'RPC failed'))
    } else {
      req.resolve(stripEnvelope(msg))
    }
  }

  function handleMessage(data: string, ws: WebSocket) {
    if (bridgeClosed) return
    const envelope = v.safeParse(browserEnvelopeSchema, data)
    if (!envelope.success) {
      if (envelope.issues.some((issue) => issue.type === 'parse_json')) {
        console.warn('Malformed automation message:', v.summarize(envelope.issues))
      } else {
        ws.close()
      }
      return
    }
    const msg = envelope.output

    if (msg.type === 'auth' || msg.type === 'register') {
      // `auth` authenticates a stdio bridge client without registering it as
      // the browser app, so it can send request/response messages without
      // becoming the RPC target. The token is validated the same way as
      // registerBrowser — when auth is disabled (authToken === null), any
      // token is accepted. A message without a token is ignored; a token of
      // any other type closes the socket.
      const handshake = v.safeParse(handshakeMessageSchema, msg)
      if (!handshake.success) {
        ws.close()
        return
      }
      const { token, window } = handshake.output
      if (token === undefined) return
      if (msg.type === 'register') {
        registerBrowser(ws, token, window ?? '')
      } else if (authorize(token)) {
        authenticatedClients.add(ws)
      } else {
        ws.close()
      }
      return
    }
    // All non-register messages require authentication. Without this
    // check, an unauthenticated WebSocket client (that hasn't sent a
    // valid register message) could bypass the HTTP auth on /rpc by
    // sending request messages over the WebSocket directly.
    if (!authenticatedClients.has(ws)) {
      ws.close()
      return
    }
    if (msg.type === 'focus') {
      // Focus is the routing signal: a tool call goes to the window that last had it, and a
      // report from anything but a registered editor window cannot move that.
      if (v.safeParse(focusMessageSchema, msg).success && browsers.has(ws)) focusedBrowser = ws
      return
    }
    const request = v.safeParse(requestMessageSchema, msg)
    if (request.success) {
      void handleClientRequest(ws, request.output)
      return
    }
    const response = v.safeParse(responseMessageSchema, msg)
    if (response.success) handleBrowserResponse(response.output, ws)
  }

  function handleClose(ws: WebSocket) {
    clients.delete(ws)
    authenticatedClients.delete(ws)
    if (!browsers.delete(ws)) return
    if (focusedBrowser === ws) focusedBrowser = null
    rejectPendingFor(ws, 'Browser disconnected')
    // Intentionally NOT rejecting connectionWaiters here. If a request
    // entered waitForConnection() before the close event (e.g. during a
    // CLOSING→CLOSED transition), the waiter should keep waiting the full
    // APP_WAIT_TIMEOUT for a reconnect. registerBrowser will resolve it
    // via notifyConnectionWaiters if the browser reconnects in time.
    notifyConnectionChange()
  }

  function handleConnection(ws: WebSocket) {
    if (bridgeClosed) return
    clients.add(ws)
    // Transport security restricts WHO can connect: Unix socket with
    // 0o600 permissions (same-user only) or TCP localhost (any local
    // process). The authenticatedClients set gates WHAT connected clients
    // can do: only those that sent a valid register message may forward
    // requests. The register prompt does NOT include the auth token —
    // the browser app sends the token proactively (from the discovery
    // file or Vite env).
    sendRegisterPrompt(ws)
  }

  function close() {
    bridgeClosed = true
    rejectAllPending('Server shutting down')
    rejectConnectionWaiters('Server shutting down')
    browsers.clear()
    focusedBrowser = null
    clients.clear()
    authenticatedClients.clear()
    connectionListeners.clear()
  }

  return {
    close,
    isConnected,
    subscribeConnectionChange,
    sendRPC,
    handleConnection,
    handleMessage,
    handleClose
  }
}
