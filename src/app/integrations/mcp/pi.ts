import { MCP_AGENT_HEADER, OPEN_PENCIL_MCP_SERVER } from '@open-pencil/core/constants'

import { getAutomationAuthToken, getMCPServerURL } from '@/app/automation/mcp/spawn'

import { isMCPHTTPConnection, mcpAuthorizationHeader, type MCPHTTPConnection } from './auth'
import { enabledMCPConnections } from './store'

export type PiMCPServer = {
  url: string
  headers?: Record<string, string>
  auth: false
}

async function externalPiMCPServer(connection: MCPHTTPConnection): Promise<PiMCPServer> {
  const authorization = await mcpAuthorizationHeader(connection)
  return {
    url: connection.transport.url,
    ...(authorization ? { headers: { Authorization: authorization } } : {}),
    auth: false
  }
}

export async function buildPiMCPServers(options?: {
  authorizationToken?: string | null
}): Promise<Record<string, PiMCPServer>> {
  const authorizationToken =
    options && 'authorizationToken' in options
      ? options.authorizationToken
      : await getAutomationAuthToken()
  const entries = await Promise.all(
    // Pi reaches remote servers only; local commands stay with the chat and ACP agents.
    enabledMCPConnections.value
      .filter(isMCPHTTPConnection)
      .map(async (connection) => [connection.name, await externalPiMCPServer(connection)] as const)
  )
  return {
    ...Object.fromEntries(entries),
    [OPEN_PENCIL_MCP_SERVER]: {
      url: getMCPServerURL(),
      // The Pi harness chat's tool calls show as its agent rather than an outside MCP client.
      headers: {
        [MCP_AGENT_HEADER]: 'harness',
        ...(authorizationToken ? { Authorization: `Bearer ${authorizationToken}` } : {})
      },
      auth: false
    }
  }
}
