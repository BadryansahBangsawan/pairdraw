import { withTimeout } from 'es-toolkit/promise'

import { describeDiagnosticError, recordMCPConnectionFailure } from '@/app/diagnostics'

import type { MCPConnection } from '../types'
import {
  connectMCPClient,
  defaultMCPConnectDependencies,
  type MCPConnectDependencies
} from './connect'
import { MCPConnectError, type MCPConnectFailure } from './errors'
import { listAllMCPTools } from './session'

const TEST_TIMEOUT_MS = 2 * 60_000

export type MCPConnectionTestResult =
  | { ok: true; tools: number }
  | { ok: false; reason: MCPConnectFailure }

/** Connects once, counts the server's tools, and disconnects, as Settings' Test button does. */
export async function testMCPConnection(
  connection: MCPConnection,
  dependencies: MCPConnectDependencies = defaultMCPConnectDependencies
): Promise<MCPConnectionTestResult> {
  try {
    return await withTimeout(async () => {
      const session = await connectMCPClient(connection, dependencies)
      try {
        const tools = await listAllMCPTools(session)
        return { ok: true, tools: tools.length }
      } finally {
        await session.close().catch(() => undefined)
      }
    }, TEST_TIMEOUT_MS)
  } catch (error) {
    recordMCPConnectionFailure({ operation: 'connect', ...describeDiagnosticError(error) })
    return { ok: false, reason: error instanceof MCPConnectError ? error.reason : 'failed' }
  }
}
