import { promiseTimeout } from '@vueuse/core'

import { IS_TAURI } from '@/constants'

import { companion, type CompanionConnection, type CompanionSession } from './connection'

/** The development MCP server's address, as `vite/automation.ts` defines it without Portless. */
const DEV_MCP_URL = /^http:\/\/127\.0\.0\.1:(\d{1,5})$/
/**
 * How long to wait before checking once more when the server did not answer, as while it
 * restarts for the app's MCP settings, rather than waiting for the companion's regular check.
 */
const RETRY_DELAY_MS = 1_000

/** The tokens `bun run dev` gave its MCP server for this tab, or null outside that server. */
function devAgentSession(): Omit<CompanionSession, 'port'> | null {
  if (!import.meta.env.DEV || IS_TAURI) return null
  if (typeof __OPENPENCIL_LOCAL_AGENT_SESSION__ === 'undefined') return null
  return __OPENPENCIL_LOCAL_AGENT_SESSION__
}

function devMCPURL(): string {
  return typeof __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__ === 'string'
    ? __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__
    : ''
}

interface DevCompanionOptions {
  connection?: Pick<CompanionConnection, 'adopt' | 'check' | 'connected' | 'state'>
  /** Defaults to the session the development server defined for this tab. */
  session?: Omit<CompanionSession, 'port'> | null
  /** Defaults to the development MCP server's HTTP address. */
  serverURL?: string
  /** Defaults to a second. */
  retryDelayMs?: number
}

/**
 * In `bun run dev`, connects this tab to the agent bridge of the MCP server the development
 * server started, with the session both were given, so coding agents work without
 * `openpencil-connect` or a pairing link. Does nothing in builds, in Tauri, under Portless, or
 * with `OPENPENCIL_DEV_AGENTS=0`. Resolves to whether the companion answered.
 */
export async function adoptDevCompanion({
  connection = companion,
  session = devAgentSession(),
  serverURL = devMCPURL(),
  retryDelayMs = RETRY_DELAY_MS
}: DevCompanionOptions = {}): Promise<boolean> {
  if (!session) return false
  // The session names no host: the server it belongs to listens on this machine's loopback.
  const port = Number(DEV_MCP_URL.exec(serverURL)?.[1])
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false
  await connection.adopt({ token: session.token, agentToken: session.agentToken, port })
  if (!connection.connected()) {
    await promiseTimeout(retryDelayMs)
    // Unless the person paired a companion or disconnected meanwhile.
    if (connection.state.dev && !connection.connected()) await connection.check()
  }
  return connection.connected()
}
