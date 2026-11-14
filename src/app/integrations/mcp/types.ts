import type { CredentialRef } from '@/app/settings/credentials/types'

export type MCPConnectionID = `mcp-${string}`

export type MCPHTTPTransport = {
  type: 'streamable-http'
  url: string
}

/**
 * A local program the desktop app starts and talks to over its standard input and output.
 * The variables' values are credentials; only their names are kept with the connection.
 */
export type MCPStdioTransport = {
  type: 'stdio'
  command: string
  args: string[]
  envNames: string[]
}

export type MCPConnectionTransport = MCPHTTPTransport | MCPStdioTransport
type MCPTransportType = MCPConnectionTransport['type']

/** OAuth tokens and the client registration live in the credential store, never in settings. */
export type MCPAuthentication =
  | { type: 'none' }
  | { type: 'bearer'; credentialRef: CredentialRef }
  | { type: 'oauth'; credentialRef: CredentialRef }

type MCPAuthenticationType = MCPAuthentication['type']

export type MCPConnection = {
  id: MCPConnectionID
  name: string
  enabled: boolean
  transport: MCPConnectionTransport
  authentication: MCPAuthentication
}

export type MCPConnectionSettings = {
  version: 1
  connections: MCPConnection[]
}

export type MCPConnectionDraft = {
  id: MCPConnectionID | null
  name: string
  enabled: boolean
  transportType: MCPTransportType
  url: string
  command: string
  /** One argument per line, so arguments with spaces need no quoting. */
  args: string
  authenticationType: MCPAuthenticationType
}
