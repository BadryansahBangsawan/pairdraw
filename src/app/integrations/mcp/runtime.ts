import type { McpServer } from '@agentclientprotocol/sdk'
import { compact } from 'es-toolkit'

import { MCP_AGENT_HEADER, MCP_CHAT_HEADER, PAIRDRAW_MCP_SERVER } from '@pairdraw/core/constants'

import { getMCPServerURL } from '@/app/automation/mcp/spawn'
import { describeDiagnosticError, recordMCPConnectionFailure } from '@/app/diagnostics'
import { isTauri } from '@/app/tauri/env'

import { mcpAuthorizationHeader } from './auth'
import { readMCPConnectionEnv } from './stdio/credentials'
import { tauriMCPStdio, type MCPStdioNative } from './stdio/native'
import { mcpStdioRequest } from './stdio/request'
import { enabledMCPConnections } from './store'
import type { MCPConnection } from './types'

export type BuiltInMCPServerOptions = {
  authorizationToken: string | null
  /** The chat the agent works for, so the app sees when that agent reaches its tools. */
  chat?: string
}

export function builtInMCPServer(options: BuiltInMCPServerOptions): McpServer {
  return {
    type: 'http',
    name: PAIRDRAW_MCP_SERVER,
    url: getMCPServerURL(),
    // An ACP chat's tool calls show as an ACP agent rather than an outside MCP client.
    headers: [
      { name: MCP_AGENT_HEADER, value: 'acp' },
      ...(options.chat ? [{ name: MCP_CHAT_HEADER, value: options.chat }] : []),
      ...(options.authorizationToken
        ? [{ name: 'Authorization', value: `Bearer ${options.authorizationToken}` }]
        : [])
    ]
  }
}

/** What handing local commands to a coding agent reaches outside this module; tests pass their own. */
export interface ACPMCPServerDependencies {
  /** Whether this app can run local commands: only the desktop shell can. */
  desktop: () => boolean
  stdio: Pick<MCPStdioNative, 'approve'>
}

const defaultACPMCPServerDependencies: ACPMCPServerDependencies = {
  desktop: isTauri,
  stdio: tauriMCPStdio
}

async function externalMCPServer(
  connection: MCPConnection,
  dependencies: ACPMCPServerDependencies
): Promise<McpServer | null> {
  const { transport } = connection
  if (transport.type === 'stdio') {
    // Only the desktop runs local commands, and only ones the person approved in the shell's
    // own dialog, as the built-in chat does; the agent then starts the approved program itself.
    if (!dependencies.desktop()) return null
    const env = await readMCPConnectionEnv(connection.id)
    let program: string
    try {
      program = await dependencies.stdio.approve(mcpStdioRequest({ ...connection, transport }, env))
    } catch (error) {
      recordMCPConnectionFailure({ operation: 'connect', ...describeDiagnosticError(error) })
      return null
    }
    return {
      name: connection.name,
      command: program,
      args: transport.args,
      env: Object.entries(env).map(([name, value]) => ({ name, value }))
    }
  }
  const authorization = await mcpAuthorizationHeader(connection)
  return {
    type: 'http',
    name: connection.name,
    url: transport.url,
    headers: authorization ? [{ name: 'Authorization', value: authorization }] : []
  }
}

/**
 * The MCP servers a coding agent gets: the app's own, then the enabled external ones. A local
 * command is left out in the browser and when the person declines it.
 */
export async function buildACPMCPServers(
  options: BuiltInMCPServerOptions,
  dependencies: ACPMCPServerDependencies = defaultACPMCPServerDependencies
): Promise<McpServer[]> {
  // The shell asks about one command line at a time, so approval dialogs never stack.
  const external = await Promise.all(
    enabledMCPConnections.value.map((connection) => externalMCPServer(connection, dependencies))
  )
  return [builtInMCPServer(options), ...compact(external)]
}
