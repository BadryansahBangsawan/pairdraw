import * as v from 'valibot'
import type { RawData, WebSocket } from 'ws'

import { socketAuthSchema } from './schema'

/** Close codes the app reads; 4000–4999 are free for applications. */
export const CLOSE_CODES = {
  unsupported: 1003,
  unauthorized: 4401,
  notFound: 4404,
  conflict: 4409,
  busy: 4429,
  failed: 4500
} as const

const AUTH_TIMEOUT_MS = 5_000
const HEARTBEAT_INTERVAL_MS = 15_000

export function rawBytes(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (Array.isArray(data)) return Buffer.concat(data)
  return Buffer.from(data)
}

export function sendJSON(ws: WebSocket, message: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message))
}

/**
 * Waits for the socket's first message, which must be `{type: 'auth', token}` with a token
 * `authorize` accepts. Anything else, or nothing in time, closes the socket.
 */
export function authenticate(
  ws: WebSocket,
  authorize: (token: string) => boolean
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), AUTH_TIMEOUT_MS)
    function finish(ok: boolean) {
      clearTimeout(timer)
      ws.off('message', onMessage)
      ws.off('close', onClose)
      if (!ok && ws.readyState === ws.OPEN) ws.close(CLOSE_CODES.unauthorized, 'Unauthorized')
      resolve(ok)
    }
    function onMessage(data: RawData, isBinary: boolean) {
      if (isBinary) return finish(false)
      const parsed = v.safeParse(socketAuthSchema, rawBytes(data).toString('utf8'))
      finish(parsed.success && authorize(parsed.output.token))
    }
    function onClose() {
      finish(false)
    }
    ws.on('message', onMessage)
    ws.once('close', onClose)
  })
}

/** Pings the socket and terminates it when a ping goes unanswered, so a vanished tab frees its process. */
export function keepAlive(ws: WebSocket): void {
  let alive = true
  ws.on('pong', () => {
    alive = true
  })
  const timer = setInterval(() => {
    if (!alive) {
      ws.terminate()
      return
    }
    alive = false
    try {
      ws.ping()
    } catch {
      ws.terminate()
    }
  }, HEARTBEAT_INTERVAL_MS)
  timer.unref()
  ws.once('close', () => clearInterval(timer))
}
