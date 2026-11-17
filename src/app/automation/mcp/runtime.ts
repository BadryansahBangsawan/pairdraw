import { useIntervalFn } from '@vueuse/core'
import { reactive, watch } from 'vue'

import { connectAutomation } from '@/app/automation/bridge/server'
import { companion } from '@/app/automation/companion/connection'
import {
  RESTART_HEALTHY_RESET_MS,
  restartDelay,
  type RestartPolicyOptions
} from '@/app/automation/restart-policy'
import type { EditorStore } from '@/app/editor/active-store'
import { isTauri } from '@/app/tauri/env'

import { mcpFailure, type MCPFailure } from './failure'
import { setMCPToolDescriptors } from './preferences'
import {
  type AutomationHealth,
  type AutomationServerHandle,
  readAutomationHealth,
  getAutomationHealthFailure,
  getAutomationStartupFailure,
  getAutomationSocketURL,
  getMCPServerURL,
  spawnMCPIfNeeded
} from './spawn'

type MCPRuntimeStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error'

export interface MCPRuntimeState {
  status: MCPRuntimeStatus
  endpoint: string
  version: string | null
  /** Whether the running server reports agents opening sessions; older servers do not. */
  agentSessionEvents: boolean
  /** Structured reason the server is unavailable; Settings renders translated copy. */
  failure: MCPFailure | null
  checking: boolean
  externallyManaged: boolean
}

export type MCPRuntimeResult = { ok: true } | { ok: false; error: Error }

export interface MCPRuntimeDependencies {
  connect: (getStore: () => EditorStore, authToken: string | null) => () => void
  canConnect: () => boolean
  readHealth: (authToken?: string | null) => Promise<AutomationHealth | null>
  setToolDescriptors: (tools: NonNullable<AutomationHealth['tools']>) => void
  spawn: () => Promise<AutomationServerHandle | null>
  /** Diagnostics for the most recent spawn/health attempt. */
  getStartupFailure: () => MCPFailure | null
  getHealthFailure: () => MCPFailure | null
  /** How often an app-owned server is checked for survival; 10 seconds unless a test says. */
  watchIntervalMs?: number
  /** How a server that stopped is started again; a growing wait and a limit on attempts. */
  restartPolicy?: RestartPolicyOptions
  /**
   * How long a server must stay up before a later stop counts as the first one.
   * Defaults to {@link RESTART_HEALTHY_RESET_MS}.
   */
  healthyResetMs?: number
}

/**
 * Turn a failed startup into the reason the user can act on. The spawn layer
 * records the real cause; without it every failure reads as one generic message.
 */
function describeStartupFailure(
  dependencies: MCPRuntimeDependencies,
  spawned: AutomationServerHandle | null
): MCPFailure {
  const startupFailure = dependencies.getStartupFailure()
  if (!spawned && startupFailure) return startupFailure

  const healthFailure = dependencies.getHealthFailure()
  if (healthFailure?.code === 'rejected' || healthFailure?.code === 'malformed') {
    return healthFailure
  }
  if (startupFailure) return startupFailure
  return mcpFailure('unreachable', getMCPServerURL())
}

/** Technical summary for logs; the UI renders translated copy from the code. */
function failureDetail(failure: MCPFailure): string {
  return failure.detail ? `${failure.code}: ${failure.detail}` : failure.code
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export function createMCPRuntimeService(dependencies: MCPRuntimeDependencies) {
  const state = reactive<MCPRuntimeState>({
    status: 'idle',
    endpoint: getMCPServerURL(),
    version: null,
    agentSessionEvents: false,
    failure: null,
    checking: false,
    externallyManaged: false
  })

  let server: AutomationServerHandle | null = null
  let disconnectAutomation: (() => void) | null = null
  let activeStore: (() => EditorStore) | null = null
  let lifecycle: Promise<void> = Promise.resolve()

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = lifecycle.then(operation, operation)
    lifecycle = next.then(
      () => undefined,
      () => undefined
    )
    return next
  }

  const SERVER_WATCH_MS = dependencies.watchIntervalMs ?? 10_000
  const HEALTHY_RESET_MS = dependencies.healthyResetMs ?? RESTART_HEALTHY_RESET_MS
  let restartAttempt = 0
  /** Bumped when a pending restart is cancelled, so a timer that already fired does not run. */
  let restartEpoch = 0
  let restartTimer: ReturnType<typeof setTimeout> | undefined
  let healthyResetTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * Watches the server this app started. A server someone else runs, such as a development one or
   * a paired companion, is not ours to restart, so it is left alone.
   */
  const serverWatch = useIntervalFn(
    () => {
      void enqueue(recoverStoppedServer)
    },
    SERVER_WATCH_MS,
    { immediate: false }
  )

  function clearRestartTimer(): void {
    restartEpoch += 1
    if (restartTimer) clearTimeout(restartTimer)
    restartTimer = undefined
  }

  function clearHealthyReset(): void {
    if (healthyResetTimer) clearTimeout(healthyResetTimer)
    healthyResetTimer = undefined
  }

  /** The attempt count returns to zero only after the server has stayed up. */
  function armHealthyReset(): void {
    if (healthyResetTimer) return
    healthyResetTimer = setTimeout(() => {
      healthyResetTimer = undefined
      restartAttempt = 0
    }, HEALTHY_RESET_MS)
  }

  function forgetRestartAttempts(): void {
    restartAttempt = 0
    clearHealthyReset()
  }

  function startWatching(): void {
    if (!serverWatch.isActive.value) serverWatch.resume()
    armHealthyReset()
  }

  function stopWatching(): void {
    serverWatch.pause()
    clearRestartTimer()
    clearHealthyReset()
  }

  async function recoverStoppedServer(): Promise<void> {
    if (state.status !== 'running' || state.externallyManaged) return
    const health = await dependencies.readHealth(server?.authToken)
    if (health) return
    // The server is gone, so the health watch waits while the restarts take over, so a server
    // that keeps dying is not started every second forever. A start that only just succeeded
    // does not wipe the attempt count; that wait is `HEALTHY_RESET_MS`.
    clearHealthyReset()
    serverWatch.pause()
    scheduleRestart()
  }

  function scheduleRestart(): void {
    const delay = restartDelay(restartAttempt, dependencies.restartPolicy)
    if (delay === null) {
      state.status = 'error'
      state.failure = mcpFailure('restart-exhausted')
      return
    }
    restartAttempt += 1
    state.failure = mcpFailure(
      'exited',
      `The MCP server stopped; starting it again (attempt ${restartAttempt}).`
    )
    const epoch = restartEpoch
    restartTimer = setTimeout(() => {
      restartTimer = undefined
      if (epoch !== restartEpoch) return
      void enqueue(async () => {
        if (epoch !== restartEpoch) return
        const result = await startOperation()
        if (result.ok) {
          startWatching()
          return
        }
        scheduleRestart()
      })
    }, delay)
  }

  function applyHealth(health: AutomationHealth): void {
    state.version = health.version ?? null
    state.agentSessionEvents = health.agentSessionEvents ?? false
    dependencies.setToolDescriptors(health.tools ?? [])
    state.status = 'running'
    state.failure = null
  }

  async function refreshOperation(): Promise<MCPRuntimeResult> {
    state.checking = true
    try {
      const health = await dependencies.readHealth(server?.authToken)
      if (health) {
        applyHealth(health)
        return { ok: true }
      }
      state.version = null
      state.agentSessionEvents = false
      dependencies.setToolDescriptors([])
      if (state.status !== 'error') state.status = 'stopped'
      return { ok: true }
    } catch (error) {
      const runtimeError = toError(error)
      state.status = 'error'
      state.failure = mcpFailure('unreachable', runtimeError.message)
      return { ok: false, error: runtimeError }
    } finally {
      state.checking = false
    }
  }

  async function disconnectCurrentServer(): Promise<Error | null> {
    disconnectAutomation?.()
    disconnectAutomation = null
    const currentServer = server
    server = null
    try {
      await currentServer?.disconnect()
      return null
    } catch (error) {
      return toError(error)
    }
  }

  async function startOperation(): Promise<MCPRuntimeResult> {
    // A restart that was already waiting must not close the server this start brings up.
    clearRestartTimer()
    // Whatever this replaces is closed first, so a restart does not leave a connection behind.
    const staleError = await disconnectCurrentServer()
    if (staleError)
      console.warn('[MCP] Closing the previous connection failed:', staleError.message)
    state.endpoint = getMCPServerURL()
    state.status = 'starting'
    state.failure = null
    state.externallyManaged = false
    let failure: MCPFailure | null
    let thrown: Error | null = null
    try {
      server = await dependencies.spawn()
      const health = await dependencies.readHealth(server?.authToken)
      if (health) {
        state.externallyManaged = server?.managed === false
        if (activeStore && dependencies.canConnect()) {
          disconnectAutomation = dependencies.connect(activeStore, server?.authToken ?? null)
        }
        applyHealth(health)
        startWatching()
        return { ok: true }
      }
      failure = describeStartupFailure(dependencies, server)
    } catch (error) {
      thrown = toError(error)
      failure = describeStartupFailure(dependencies, server)
    }

    const disconnectError = await disconnectCurrentServer()
    const detail = failureDetail(failure)
    state.status = 'error'
    state.failure = failure
    if (thrown) console.warn('[MCP]', detail, thrown)
    else console.warn('[MCP]', detail)
    return {
      ok: false,
      error: disconnectError
        ? new Error(`${detail}. Cleanup failed: ${disconnectError.message}`)
        : new Error(detail)
    }
  }

  async function stopOperation(releaseStore: boolean): Promise<MCPRuntimeResult> {
    stopWatching()
    const disconnectError = await disconnectCurrentServer()
    if (releaseStore) activeStore = null
    state.status = disconnectError ? 'error' : 'stopped'
    state.version = null
    state.agentSessionEvents = false
    state.failure = disconnectError ? mcpFailure('unknown', disconnectError.message) : null
    state.externallyManaged = false
    dependencies.setToolDescriptors([])
    return disconnectError ? { ok: false, error: disconnectError } : { ok: true }
  }

  return {
    state,
    /** Whether the editor started the runtime, so a restart has a store to connect. */
    started: () => activeStore !== null,
    refresh: () => enqueue(refreshOperation),
    start(getStore: () => EditorStore): Promise<MCPRuntimeResult> {
      clearRestartTimer()
      forgetRestartAttempts()
      activeStore = getStore
      return enqueue(startOperation)
    },
    stop: () => enqueue(() => stopOperation(true)),
    restart: () =>
      enqueue(async () => {
        clearRestartTimer()
        forgetRestartAttempts()
        const stopResult = await stopOperation(false)
        if (!stopResult.ok) return stopResult
        if (!activeStore) {
          const error = new Error('Editor is not ready')
          state.status = 'error'
          state.failure = null
          return { ok: false, error }
        }
        return startOperation()
      })
  }
}

/**
 * The local server runs with the desktop app, in development with the dev server, and for the
 * web app in a companion it paired with.
 */
export function localMCPAvailable(): boolean {
  return import.meta.env.DEV || isTauri() || companion.connected()
}

const appMCPRuntime = createMCPRuntimeService({
  connect: (getStore, authToken) =>
    connectAutomation(getStore, authToken, getAutomationSocketURL()).disconnect,
  canConnect: localMCPAvailable,
  readHealth: readAutomationHealth,
  setToolDescriptors: setMCPToolDescriptors,
  spawn: spawnMCPIfNeeded,
  getStartupFailure: getAutomationStartupFailure,
  getHealthFailure: getAutomationHealthFailure
})

export const mcpRuntime = appMCPRuntime.state
export const refreshMCPRuntime = appMCPRuntime.refresh
export const restartMCPRuntime = () => appMCPRuntime.restart()
export const startMCPRuntime = (getStore: () => EditorStore) => appMCPRuntime.start(getStore)
export const stopMCPRuntime = () => appMCPRuntime.stop()

// Pairing with a companion, or losing it, moves the app's bridge to the server it now has. The
// development server's own session keeps the bridge where it is, so it never restarts it.
watch(
  () => companion.connected() && !companion.state.dev,
  () => {
    if (appMCPRuntime.started()) void appMCPRuntime.restart()
  }
)
