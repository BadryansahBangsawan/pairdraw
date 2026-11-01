import type { MiddlewareHandler } from 'hono'
import type { WebSocketServer } from 'ws'

import type { AgentBridge } from '#mcp/agents/index'
import { isAllowedOrigin, isLoopbackHost } from '#mcp/transport/origins'

import type { UpgradeHandler } from './lifecycle'

/**
 * Refuses requests from pages of other sites, and requests addressed to a name other than this
 * machine's, as a page that rebound its DNS name to 127.0.0.1 sends. CORS only hides answers from
 * other sites; refusing the request also stops them from acting, such as spending pairing
 * attempts.
 */
export function originGuard(origins: readonly string[]): MiddlewareHandler {
  return async (c, next) => {
    if (!isLoopbackHost(c.req.header('host'))) return c.json({ error: 'Host not allowed' }, 403)
    if (!isAllowedOrigin(c.req.header('origin'), origins)) {
      return c.json({ error: 'Origin not allowed' }, 403)
    }
    await next()
    // Chrome asks before a public site reaches this machine; the answer comes from the server.
    if (c.req.method === 'OPTIONS' && c.req.header('access-control-request-private-network')) {
      c.res.headers.set('Access-Control-Allow-Private-Network', 'true')
    }
    return undefined
  }
}

/**
 * Routes WebSocket upgrades: agent sockets to the agent bridge, everything else to the app's
 * automation bridge. Browsers always send `Origin` on an upgrade, so a page from another site is
 * refused before either sees it.
 */
export function createUpgradeHandler(
  origins: readonly string[],
  wss: WebSocketServer,
  agentBridge: AgentBridge | null
): UpgradeHandler {
  return (request, socket, head) => {
    if (
      !isLoopbackHost(request.headers.host) ||
      !isAllowedOrigin(request.headers.origin, origins)
    ) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
      return
    }
    if (agentBridge?.handleUpgrade(request, socket, head)) return
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  }
}
