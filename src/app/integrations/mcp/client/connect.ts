import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
  type AuthProvider,
  type FetchLike,
  type OAuthClientProvider,
  type StreamableHTTPClientTransportOptions,
  type Transport
} from '@modelcontextprotocol/client'

import { OPEN_PENCIL_MCP_SERVER } from '@open-pencil/core/constants'

import { APP_VERSION } from '@/app/runtime/version'
import { appCredentialServices } from '@/app/settings/credentials/app'
import { isTauri } from '@/app/tauri/env'
import { APP_NAME } from '@/constants'

import type { MCPHTTPConnection } from '../auth'
import { mcpFetch } from '../http'
import {
  createMCPOAuthProvider,
  MCPSignInRequiredError,
  mcpOAuthRedirectURL
} from '../oauth/provider'
import { readMCPConnectionEnv } from '../stdio/credentials'
import type { MCPEnvironment } from '../stdio/env'
import { MCPStdioError, tauriMCPStdio, type MCPStdioNative } from '../stdio/native'
import { mcpStdioRequest } from '../stdio/request'
import { NativeStdioTransport } from '../stdio/transport'
import type { MCPConnection, MCPStdioTransport } from '../types'
import { MCPConnectError } from './errors'

/** A connected MCP server and the way to let it go. */
export interface MCPClientSession {
  client: Client
  close(): Promise<void>
}

/** What connecting reaches outside this module; tests pass their own. */
export interface MCPConnectDependencies {
  fetch?: FetchLike
  /** Whether this app can run local commands: only the desktop shell can. */
  desktop: () => boolean
  stdio: MCPStdioNative
  env: (connection: MCPConnection) => Promise<MCPEnvironment>
  bearer: (connection: MCPConnection) => Promise<string | null>
  oauth: (connection: MCPHTTPConnection) => OAuthClientProvider
  /** Builds a transport instead, as tests do with an in-memory server. */
  transport?: (connection: MCPConnection) => Transport | null
}

export const defaultMCPConnectDependencies: MCPConnectDependencies = {
  get fetch() {
    return mcpFetch()
  },
  desktop: isTauri,
  stdio: tauriMCPStdio,
  env: (connection) => readMCPConnectionEnv(connection.id),
  bearer: async (connection) =>
    connection.authentication.type === 'bearer'
      ? appCredentialServices.resolver.resolve(connection.authentication.credentialRef)
      : null,
  oauth: (connection) =>
    createMCPOAuthProvider(connection.id, { redirectURL: mcpOAuthRedirectURL() })
}

async function httpAuthProvider(
  connection: MCPHTTPConnection,
  dependencies: MCPConnectDependencies
): Promise<AuthProvider | OAuthClientProvider | undefined> {
  const { authentication } = connection
  if (authentication.type === 'none') return undefined
  if (authentication.type === 'oauth') return dependencies.oauth(connection)
  const token = await dependencies.bearer(connection)
  if (!token) throw new MCPConnectError('credential')
  return { token: async () => token }
}

async function stdioTransport(
  connection: MCPConnection & { transport: MCPStdioTransport },
  dependencies: MCPConnectDependencies
): Promise<Transport> {
  if (!dependencies.desktop()) throw new MCPConnectError('desktop-only')
  const env = await dependencies.env(connection)
  return new NativeStdioTransport(mcpStdioRequest(connection, env), dependencies.stdio)
}

async function connectionTransport(
  connection: MCPConnection,
  dependencies: MCPConnectDependencies
): Promise<Transport> {
  const injected = dependencies.transport?.(connection)
  if (injected) return injected
  const { transport } = connection
  if (transport.type === 'stdio') return stdioTransport({ ...connection, transport }, dependencies)
  const authProvider = await httpAuthProvider({ ...connection, transport }, dependencies)
  const options: StreamableHTTPClientTransportOptions = {}
  if (authProvider) options.authProvider = authProvider
  if (dependencies.fetch) options.fetch = dependencies.fetch
  return new StreamableHTTPClientTransport(new URL(transport.url), options)
}

function connectFailure(error: unknown): MCPConnectError {
  if (error instanceof MCPConnectError) return error
  if (error instanceof MCPSignInRequiredError || error instanceof UnauthorizedError) {
    return new MCPConnectError('sign-in', { cause: error })
  }
  if (error instanceof MCPStdioError && error.kind === 'declined') {
    return new MCPConnectError('declined', { cause: error })
  }
  return new MCPConnectError('failed', { cause: error })
}

/**
 * Connects to one external MCP server as this app's MCP client: over Streamable HTTP with its
 * bearer token or OAuth sign-in, or, on the desktop, by starting its local command.
 */
export async function connectMCPClient(
  connection: MCPConnection,
  dependencies: MCPConnectDependencies = defaultMCPConnectDependencies
): Promise<MCPClientSession> {
  // The identifier stays OpenPencil's; servers show the title.
  const client = new Client({ name: OPEN_PENCIL_MCP_SERVER, title: APP_NAME, version: APP_VERSION })
  try {
    const transport = await connectionTransport(connection, dependencies)
    await client.connect(transport)
  } catch (error) {
    await client.close().catch(() => undefined)
    throw connectFailure(error)
  }
  return { client, close: () => client.close() }
}
