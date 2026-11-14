import { locale } from '@pairdraw/vue/i18n'

import type { MCPConnection, MCPStdioTransport } from '../types'
import type { MCPEnvironment } from './env'
import type { MCPStdioSpawnRequest } from './native'

/** What the desktop shell needs to approve and run a local command. */
export function mcpStdioRequest(
  connection: MCPConnection & { transport: MCPStdioTransport },
  env: MCPEnvironment
): MCPStdioSpawnRequest {
  return {
    connectionId: connection.id,
    name: connection.name,
    command: connection.transport.command,
    args: connection.transport.args,
    env: Object.entries(env).map(([name, value]) => ({ name, value })),
    locale: locale.get()
  }
}
