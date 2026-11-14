import { randomUUID } from 'node:crypto'
import process from 'node:process'

import { AUTOMATION_HTTP_PORT } from '@pairdraw/core/constants'

import { devAutomationRoute } from '../src/app/automation/bridge/portless-route'
import {
  automationPlugin,
  createDevAgentSession,
  type DevAgentSession
} from '../src/app/automation/bridge/vite-plugin'

const devAutomationAuthToken = process.env.PAIRDRAW_DEV_TOKEN ?? randomUUID()
let devAgentSession: DevAgentSession | null = null

export function localAutomationToken(command: string): string | null {
  return command === 'serve' ? devAutomationAuthToken : null
}

/**
 * The tab session that lets the development server's own tab start coding agents through its MCP
 * server without a pairing link, made once per Vite process and never derived from
 * `PAIRDRAW_DEV_TOKEN`. Null for builds, the Cloud mode, Tauri development (the
 * desktop app runs agents itself, and `TAURI_DEV_HOST` exposes the server beyond this machine),
 * Portless (its MCP server is not on the port the tab knows), and `PAIRDRAW_DEV_AGENTS=0`.
 */
export function localAgentSession(
  command: string,
  mode: string,
  env: NodeJS.ProcessEnv = process.env
): DevAgentSession | null {
  if (command !== 'serve' || mode === 'cloud') return null
  if (env.TAURI_DEV_HOST || env.TAURI_ENV_PLATFORM) return null
  if (env.PORTLESS_URL) return null
  if (env.PAIRDRAW_DEV_AGENTS === '0') return null
  devAgentSession ??= createDevAgentSession()
  return devAgentSession
}

function automationCORSOrigin(host: string | undefined): string {
  return host ? `http://${host}:1420` : 'http://localhost:1420'
}

export function localAutomationRoute(host: string | undefined) {
  const port = Number(process.env.PAIRDRAW_DEV_MCP_PORT ?? AUTOMATION_HTTP_PORT)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('PAIRDRAW_DEV_MCP_PORT must be an integer between 1024 and 65535')
  }
  const origin = process.env.PAIRDRAW_DEV_ORIGIN ?? automationCORSOrigin(host)
  const url = new URL(origin)
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    throw new Error('PAIRDRAW_DEV_ORIGIN must be an HTTP(S) origin')
  }
  return { ...devAutomationRoute(process.env.PORTLESS_URL, port, origin), httpPort: port }
}

export function pairdrawAutomationPlugin(command: string, host: string | undefined, mode: string) {
  return automationPlugin(localAutomationToken(command), {
    ...localAutomationRoute(host),
    agentSession: localAgentSession(command, mode)
  })
}
