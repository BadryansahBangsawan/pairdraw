import type { FetchLike } from '@modelcontextprotocol/client'

import { describeDiagnosticError, recordMCPConnectionFailure } from '@/app/diagnostics'
import { appCredentialServices } from '@/app/settings/credentials/app'

import { mcpFetch } from './http'
import {
  createMCPOAuthProvider,
  MCPSignInRequiredError,
  mcpOAuthRedirectURL
} from './oauth/provider'
import { credentialMCPOAuthStore, mcpOAuthTokensFresh, type MCPOAuthStore } from './oauth/state'
import type { MCPConnection, MCPHTTPTransport } from './types'

/** A remote connection, the only kind that authenticates with a header. */
export type MCPHTTPConnection = MCPConnection & { transport: MCPHTTPTransport }

export function isMCPHTTPConnection(connection: MCPConnection): connection is MCPHTTPConnection {
  return connection.transport.type === 'streamable-http'
}

export interface MCPOAuthTokenOptions {
  store?: MCPOAuthStore
  redirectURL?: string
  fetch?: FetchLike
}

/**
 * The access token a signed-in connection sends now, refreshed first when it has expired.
 * Rejects with `MCPSignInRequiredError` when only a new sign-in in Settings would help.
 */
export async function mcpOAuthAccessToken(
  connection: MCPHTTPConnection,
  { store = credentialMCPOAuthStore, redirectURL, fetch }: MCPOAuthTokenOptions = {}
): Promise<string> {
  const saved = await store.read(connection.id)
  if (saved.tokens && mcpOAuthTokensFresh(saved)) return saved.tokens.access_token
  if (!saved.tokens) throw new MCPSignInRequiredError()
  const provider = createMCPOAuthProvider(connection.id, {
    redirectURL: redirectURL ?? mcpOAuthRedirectURL(),
    store
  })
  const fetchFn = fetch ?? mcpFetch()
  // Loaded only to refresh, so starting an agent session does not load the MCP client.
  const { auth } = await import('@modelcontextprotocol/client')
  await auth(provider, { serverUrl: connection.transport.url, ...(fetchFn ? { fetchFn } : {}) })
  const refreshed = await store.read(connection.id)
  if (!refreshed.tokens) throw new MCPSignInRequiredError()
  return refreshed.tokens.access_token
}

/**
 * The `Authorization` value for a remote connection, null when it uses none. Agents that start
 * their own MCP clients (ACP, Pi) get the header; failures are recorded and rethrown, as a
 * session cannot start with a connection it was told to use.
 */
export async function mcpAuthorizationHeader(connection: MCPConnection): Promise<string | null> {
  const { authentication } = connection
  if (authentication.type === 'none' || !isMCPHTTPConnection(connection)) return null
  try {
    if (authentication.type === 'bearer') {
      const token = await appCredentialServices.resolver.resolve(authentication.credentialRef)
      if (!token) throw new Error('MCP connection needs a bearer token')
      return `Bearer ${token}`
    }
    return `Bearer ${await mcpOAuthAccessToken(connection)}`
  } catch (error) {
    recordMCPConnectionFailure({ operation: 'connect', ...describeDiagnosticError(error) })
    throw error
  }
}
