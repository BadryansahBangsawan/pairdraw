import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { startServer, type ServerHandle } from '@pairdraw/mcp'

import { createMCPRuntimeService } from '@/app/automation/mcp/runtime'
import type { EditorStore } from '@/app/editor/active-store'

import { asDouble } from '#tests/helpers/doubles'

const AUTH_TOKEN = 'runtime-restart-token'
/** How long the real server waits for an app before its own watchdog closes it. */
const APP_ATTACH_TIMEOUT_MS = 250

const getStore = () => asDouble<EditorStore>({})

/**
 * Integration tests against real server processes keep the platform clock: the point is the
 * server closing itself after its own watchdog, which no fake timer can drive in another process.
 */
async function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('the runtime did not reach the state in time')
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    })
  }
}

describe('MCP runtime and a server that stops on its own', () => {
  const opened: ServerHandle[] = []

  afterEach(async () => {
    await Promise.all(opened.splice(0).map((handle) => handle.close().catch(() => undefined)))
  })

  async function startRealServer(): Promise<ServerHandle> {
    const directory = await mkdtemp(join(tmpdir(), 'pairdraw-runtime-restart-'))
    const handle = await startServer({
      httpPort: 0,
      withTcp: true,
      socketPath: process.platform === 'win32' ? null : join(directory, 'mcp.sock'),
      authToken: AUTH_TOKEN,
      mcpRoot: null,
      appAttachTimeoutMs: APP_ATTACH_TIMEOUT_MS
    })
    opened.push(handle)
    return handle
  }

  function setup() {
    let current: ServerHandle | null = null
    let spawns = 0
    let refuseSpawns = false
    const service = createMCPRuntimeService({
      canConnect: () => true,
      connect: () => () => undefined,
      readHealth: async () => {
        if (!current) return null
        const response = await fetch(`http://127.0.0.1:${current.httpPort}/health`, {
          headers: { authorization: `Bearer ${AUTH_TOKEN}` }
        }).catch(() => null)
        if (!response?.ok) return null
        return { status: 'ok', version: '0.0.0-test' }
      },
      setToolDescriptors: () => undefined,
      getStartupFailure: () => null,
      getHealthFailure: () => null,
      spawn: async () => {
        if (refuseSpawns) return null
        spawns += 1
        current = await startRealServer()
        return {
          authToken: AUTH_TOKEN,
          managed: true,
          disconnect: () => current?.close()
        }
      },
      watchIntervalMs: 25,
      restartPolicy: { baseMs: 10, limitMs: 20, attempts: 3 }
    })
    return {
      service,
      spawns: () => spawns,
      refuse: () => {
        refuseSpawns = true
      }
    }
  }

  test('starts the server again after its app-attach watchdog closed it', async () => {
    const { service, spawns } = setup()
    expect(await service.start(getStore)).toEqual({ ok: true })
    expect(spawns()).toBe(1)

    // Nothing registers as the app, so the real server closes itself after its grace period.
    await waitFor(() => spawns() === 2)
    await service.refresh()
    expect(service.state.status).toBe('running')
    expect(service.state.failure).toBeNull()
    await service.stop()
  })

  test('reports a server that keeps stopping instead of restarting it forever', async () => {
    const { service, spawns, refuse } = setup()
    await service.start(getStore)
    refuse()
    await waitFor(() => service.state.failure?.code === 'restart-exhausted')
    expect(service.state.status).toBe('error')
    // Three attempts after the first start, then the person is told rather than retried forever.
    expect(spawns()).toBe(1)
    await service.stop()
  })
})
