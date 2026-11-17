import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { IncomingMessage } from 'node:http'
import { join } from 'node:path'
import type { Readable } from 'node:stream'

import { delay } from 'es-toolkit'
import type { Plugin } from 'vite'

import { serializeDisabledTools } from '@pairdraw/mcp/tools'
import { platformHasUnixSockets } from '@pairdraw/mcp/transport'
import { randomHex } from '@pairdraw/scene-graph/random'

import type { CompanionSession } from '../companion/connection'
import {
  DEV_MCP_RESTART_PATH,
  parseDevMCPConfiguration,
  type DevMCPConfiguration
} from '../mcp/dev-control'
import type { RestartPolicyOptions } from '../restart-policy'
import { waitForChildReady } from './child-ready'
import { devMCPDiscoveryPath, devMCPRuntimeDirectory } from './discovery-path'
import { createRestartScheduler } from './restart-scheduler'

/**
 * The tab session the development server gives the MCP server it starts and, through
 * `__PAIRDRAW_LOCAL_AGENT_SESSION__`, its own tab, so the tab reaches the agent bridge without
 * a pairing link (`src/app/automation/companion/dev.ts`). It is the companion session the tab
 * adopts, without the port the tab already knows.
 */
export type DevAgentSession = Pick<CompanionSession, 'token' | 'agentToken'>

/** Two unrelated random tokens, so neither can be derived from the other or the dev token. */
export function createDevAgentSession(): DevAgentSession {
  return { token: randomHex(32), agentToken: randomHex(32) }
}

interface AutomationEnvironmentOptions {
  authToken: string | null
  /** The tab session for the agent bridge, or null to start the server without the bridge. */
  agentSession?: DevAgentSession | null
  baseEnv: NodeJS.ProcessEnv
  configuration: DevMCPConfiguration
  corsOrigin: string
  discoveryPath: string | null
  httpPort: number
  socketPath: string | null
}

export function createAutomationEnvironment(
  options: AutomationEnvironmentOptions
): NodeJS.ProcessEnv {
  const { authToken, baseEnv, configuration, corsOrigin, discoveryPath, httpPort, socketPath } =
    options
  const childEnv = { ...baseEnv }
  delete childEnv.PAIRDRAW_MCP_SOCKET
  delete childEnv.PAIRDRAW_MCP_AUTH_TOKEN
  // Only a session this server made, and handed its own tab, may start the agent bridge.
  delete childEnv.PAIRDRAW_MCP_AGENTS
  delete childEnv.PAIRDRAW_MCP_AGENT_SESSION
  delete childEnv.PAIRDRAW_MCP_AGENT_TOKEN
  const environment: NodeJS.ProcessEnv = {
    ...childEnv,
    PORT: String(httpPort),
    PAIRDRAW_MCP_TCP: '1',
    PAIRDRAW_MCP_AUTH_TOKEN: configuration.authenticationEnabled ? (authToken ?? '') : '',
    PAIRDRAW_MCP_CORS_ORIGIN: corsOrigin,
    PAIRDRAW_MCP_ROOT: configuration.rootDirectory.trim() || process.cwd(),
    PAIRDRAW_MCP_DISABLED_TOOLS: serializeDisabledTools(configuration.disabledTools),
    PAIRDRAW_MCP_SCOPE: configuration.scope
  }
  if (socketPath) environment.PAIRDRAW_MCP_SOCKET = socketPath
  if (discoveryPath) environment.PAIRDRAW_MCP_DISCOVERY_PATH = discoveryPath
  if (options.agentSession) {
    environment.PAIRDRAW_MCP_AGENTS = '1'
    environment.PAIRDRAW_MCP_AGENT_SESSION = options.agentSession.token
    environment.PAIRDRAW_MCP_AGENT_TOKEN = options.agentSession.agentToken
  }
  return environment
}

const MAX_CONFIGURATION_BYTES = 70_000
const CHILD_EXIT_TIMEOUT_MS = 2_000
const CHILD_HEALTH_ATTEMPTS = 200
const CHILD_HEALTH_DELAY_MS = 50

type DevMCPConfigurationErrorStatus = 400 | 413

class DevMCPConfigurationRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: DevMCPConfigurationErrorStatus,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'DevMCPConfigurationRequestError'
  }
}

export class DevMCPConfigurationTooLargeError extends DevMCPConfigurationRequestError {
  constructor() {
    super('Request body is too large', 413)
    this.name = 'DevMCPConfigurationTooLargeError'
  }
}

export class DevMCPConfigurationSyntaxError extends DevMCPConfigurationRequestError {
  constructor(cause: unknown) {
    super('Malformed JSON configuration', 400, { cause })
    this.name = 'DevMCPConfigurationSyntaxError'
  }
}

export function devMCPConfigurationErrorStatus(error: unknown): 400 | 413 | 500 {
  return error instanceof DevMCPConfigurationRequestError ? error.statusCode : 500
}

export async function readDevMCPConfiguration(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let byteLength = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    byteLength += buffer.byteLength
    if (byteLength > MAX_CONFIGURATION_BYTES) throw new DevMCPConfigurationTooLargeError()
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch (error) {
    throw new DevMCPConfigurationSyntaxError(error)
  }
}

export async function waitForAutomationHealth(
  browserURL: string,
  fetcher: typeof fetch = fetch,
  options: { assertRunning?: () => void } = {}
): Promise<void> {
  const healthURL = `${browserURL.replace(/^ws/, 'http')}/health`
  for (let attempt = 0; attempt < CHILD_HEALTH_ATTEMPTS; attempt++) {
    options.assertRunning?.()
    let healthy = false
    try {
      const response = await fetcher(healthURL, { signal: AbortSignal.timeout(2000) })
      healthy = response.ok
    } catch (error) {
      if (attempt === CHILD_HEALTH_ATTEMPTS - 1) {
        console.warn(`[MCP] Health check failed at ${healthURL}`, error)
      }
    }
    options.assertRunning?.()
    if (healthy) return
    await delay(CHILD_HEALTH_DELAY_MS)
  }
  throw new Error(`MCP server did not become healthy at ${healthURL}`)
}

/** `stdio` pipes stderr, which is how the plugin reads the readiness marker. */
type SpawnedMCPProcess = ChildProcess & { stderr: Readable }

type SpawnMCPProcess = (
  command: string,
  args: readonly string[],
  options: { stdio: readonly ['ignore', 'inherit', 'pipe']; env: NodeJS.ProcessEnv }
) => SpawnedMCPProcess

interface AutomationPluginOptions {
  /** Kept for the plugin's lifetime, so a restarted server still accepts the tab's session. */
  agentSession?: DevAgentSession | null
  browserURL: string
  corsOrigin: string
  httpPort: number
  portlessServiceName: string | null
  runtimeId: string
  /** Overrides the restart cadence. The dev server uses the shared default. */
  restartPolicy?: RestartPolicyOptions
  /** Replaces the process the plugin starts. Tests pass a stand-in; development uses `spawn`. */
  spawnProcess?: SpawnMCPProcess
}

export function configurationsMatch(
  current: DevMCPConfiguration,
  next: DevMCPConfiguration
): boolean {
  return (
    current.authenticationEnabled === next.authenticationEnabled &&
    current.rootDirectory === next.rootDirectory &&
    current.scope === next.scope &&
    current.disabledTools.length === next.disabledTools.length &&
    current.disabledTools.every((tool, index) => tool === next.disabledTools[index])
  )
}

// TODO: production — bundle MCP server as Tauri sidecar or spawn via shell plugin
export function automationPlugin(
  authToken: string | null,
  options: AutomationPluginOptions
): Plugin {
  let child: ReturnType<typeof spawn> | null = null
  let lifecycle = Promise.resolve()
  let configuration: DevMCPConfiguration = {
    authenticationEnabled: true,
    rootDirectory: '',
    disabledTools: [],
    scope: 'document'
  }

  function enqueue(operation: () => Promise<void>): Promise<void> {
    const next = lifecycle.then(operation, operation)
    lifecycle = next.catch(() => undefined)
    return next
  }

  async function stopChild(): Promise<void> {
    const running = child
    if (!running) return
    child = null
    // A child this process stops on purpose is not one to bring back.
    intentionalStops.add(running)
    const exited = new Promise<void>((resolve) => {
      running.once('exit', () => resolve())
    })
    running.kill()
    let timeout: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<boolean>((resolve) => {
      timeout = setTimeout(() => resolve(true), CHILD_EXIT_TIMEOUT_MS)
    })
    const exitedGracefully = await Promise.race([exited.then(() => false), timedOut])
    if (timeout) clearTimeout(timeout)
    if (!exitedGracefully && running.exitCode === null) {
      running.kill('SIGKILL')
      await exited
    }
  }

  /**
   * Starts the server again after it dies, with a growing wait and a limit. A development server
   * that lost its child — a crash, a stray kill, an out-of-memory exit — would otherwise leave
   * every client of the MCP URL with nothing to connect to until the whole dev server restarted.
   */
  const restarts = createRestartScheduler({
    policy: options.restartPolicy,
    retry: () => {
      if (stopped || child) return
      void enqueue(startChild).catch((error: unknown) => {
        console.error(
          `[MCP] Restart failed: ${error instanceof Error ? error.message : String(error)}`
        )
        restarts.afterCrash()
      })
    },
    report: (_reason, attempts) => {
      console.error(
        `[MCP] Stopped restarting the development server after ${attempts} failed attempts.`,
        { attempts }
      )
    }
  })

  function stopRestarting(): void {
    stopped = true
    restarts.stop()
  }

  async function startChild(): Promise<void> {
    const runtimeDir = devMCPRuntimeDirectory(options.runtimeId)
    await mkdir(runtimeDir, { recursive: true, mode: 0o700 })
    const socketPath = platformHasUnixSockets() ? join(runtimeDir, 'mcp.sock') : null
    const discoveryPath = devMCPDiscoveryPath(options.runtimeId)
    const command = ['bun', 'run', 'packages/mcp/src/index.ts']
    const spawnCommand = options.portlessServiceName ? 'portless' : command[0]
    const spawnArgs = options.portlessServiceName
      ? ['run', '--name', options.portlessServiceName, ...command]
      : command.slice(1)
    const readyMarker = `pairdraw-ready:${randomUUID()}`
    const spawnOptions: {
      stdio: ['ignore', 'inherit', 'pipe']
      env: NodeJS.ProcessEnv
    } = {
      stdio: ['ignore', 'inherit', 'pipe'],
      env: {
        ...createAutomationEnvironment({
          authToken,
          agentSession: options.agentSession,
          baseEnv: process.env,
          configuration,
          corsOrigin: options.corsOrigin,
          discoveryPath,
          httpPort: options.httpPort,
          socketPath
        }),
        PAIRDRAW_MCP_READY_MARKER: readyMarker
      }
    }
    // Call `spawn` directly so its stdio overload keeps stderr as a stream. A stand-in
    // returns the same shape. Combining the two functions first loses that overload.
    const spawned = options.spawnProcess
      ? options.spawnProcess(spawnCommand, spawnArgs, spawnOptions)
      : spawn(spawnCommand, spawnArgs, spawnOptions)
    const ready = waitForChildReady(spawned, readyMarker)
    child = spawned

    spawned.on('error', (err) => {
      console.error(`[MCP] Failed to spawn automation server: ${err.message}`)
      if (child === spawned) child = null
    })

    spawned.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('EADDRINUSE')) {
        console.error(
          `\x1b[31m[MCP] MCP bind failed (${options.browserURL}${socketPath ? ` or socket ${socketPath}` : ''}). Is another Pairdraw instance running?\x1b[0m`
        )
        intentionalStops.add(spawned)
        spawned.kill()
        if (child === spawned) child = null
        return
      }
      process.stderr.write(data)
    })

    spawned.on('exit', (code) => {
      if (code && code !== 0) console.error(`[MCP] Server exited with code ${code}`)
      if (child === spawned) child = null
      if (!intentionalStops.has(spawned)) restarts.afterCrash()
    })

    try {
      await ready
    } catch (error) {
      spawned.kill()
      throw error
    }
    await waitForAutomationHealth(options.browserURL, fetch, {
      assertRunning() {
        if (child !== spawned || spawned.exitCode !== null || spawned.signalCode !== null) {
          throw new Error('MCP child exited before becoming ready')
        }
      }
    })
    // A server that came up healthy gets the first delay again if it dies later.
    restarts.afterSuccess()
  }

  async function restartChild(nextConfiguration: DevMCPConfiguration): Promise<void> {
    if (child && configurationsMatch(configuration, nextConfiguration)) return
    configuration = nextConfiguration
    await stopChild()
    await startChild()
  }

  const intentionalStops = new WeakSet<ChildProcess>()
  let stopped = false

  return {
    name: 'pairdraw-automation',
    async configureServer(server) {
      server.middlewares.use(DEV_MCP_RESTART_PATH, (request, response, next) => {
        if (request.method !== 'POST') {
          next()
          return
        }
        if (!authToken || request.headers.authorization !== `Bearer ${authToken}`) {
          response.statusCode = 401
          response.end('Unauthorized')
          return
        }
        void (async () => {
          try {
            const rawConfiguration = await readDevMCPConfiguration(request)
            const nextConfiguration = parseDevMCPConfiguration(rawConfiguration)
            if (!nextConfiguration) {
              response.statusCode = 400
              response.end('Invalid MCP configuration')
              return
            }
            await enqueue(() => restartChild(nextConfiguration))
            response.statusCode = 204
            response.end()
          } catch (error) {
            response.statusCode = devMCPConfigurationErrorStatus(error)
            response.end(error instanceof Error ? error.message : String(error))
          }
        })()
      })
      await enqueue(startChild)
    },
    async buildEnd() {
      stopRestarting()
      await enqueue(stopChild)
    }
  }
}
