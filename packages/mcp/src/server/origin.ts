import type { MiddlewareHandler } from 'hono'
import type { WebSocketServer } from 'ws'

import type { AgentBridge } from '#mcp/agents/index'
import { isAllowedOrigin } from '#mcp/transport/origins'

import type { UpgradeHandler } from './lifecycle'

/**
 * Refuses requests from pages of other sites. CORS only hides answers from them; refusing the
 * request also stops them from acting, such as spending pairing attempts or reaching the server
 * through a DNS name they rebound to this machine.
 */
export function originGuard(origins: readonly string[]): MiddlewareHandler {
  return async (c, next) => {
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
    if (!isAllowedOrigin(request.headers.origin, origins)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
      return
    }
    if (agentBridge?.handleUpgrade(request, socket, head)) return
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  }
}
