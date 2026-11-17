import { afterEach, describe, expect, test, vi } from 'bun:test'

import type { ToolDescriptor } from '@pairdraw/mcp/tools'

import { createMCPRuntimeService, type MCPRuntimeDependencies } from '@/app/automation/mcp/runtime'
import type { EditorStore } from '@/app/editor/active-store'

import { asDouble } from '#tests/helpers/doubles'

function descriptor(name = 'get_page_tree'): ToolDescriptor {
  return {
    name,
    description: name,
    effect: 'read',
    availability: 'default',
    capabilities: ['document:read'],
    enabled: true
  }
}

function setup(overrides: Partial<MCPRuntimeDependencies> = {}) {
  const calls: string[] = []
  const catalogs: ToolDescriptor[][] = []
  const dependencies: MCPRuntimeDependencies = {
    canConnect: () => true,
    connect: () => {
      calls.push('connect')
      return () => calls.push('disconnect-bridge')
    },
    readHealth: async () => ({ status: 'ok', version: '0.14.0', tools: [descriptor()] }),
    setToolDescriptors: (tools) => catalogs.push(tools),
    getStartupFailure: () => null,
    getHealthFailure: () => null,
    spawn: async () => ({
      authToken: 'token',
      managed: true,
      disconnect: () => {
        calls.push('disconnect-server')
      }
    }),
    ...overrides
  }
  return { calls, catalogs, service: createMCPRuntimeService(dependencies) }
}

const getStore = () => asDouble<EditorStore>({})

afterEach(() => {
  vi.useRealTimers()
})

/** Runs timers the runtime scheduled, then the promises those timers started. */
async function advance(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms)
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

/** Waits for the runtime to reach a state, instead of guessing how long it takes. */
async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('the runtime did not reach the state in time')
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    })
  }
}

describe('MCP runtime service', () => {
  test('starts only after a healthy server response', async () => {
    const { calls, catalogs, service } = setup()

    expect(await service.start(getStore)).toEqual({ ok: true })
    expect(service.state.status).toBe('running')
    expect(service.state.version).toBe('0.14.0')
    expect(calls).toEqual(['connect'])
    expect(catalogs.at(-1)?.map((tool) => tool.name)).toEqual(['get_page_tree'])
  })

  test('restarts an app-owned server that stops, without a restart of the app', async () => {
    let healthy = true
    let spawns = 0
    const { service } = setup({
      watchIntervalMs: 20,
      readHealth: async () =>
        healthy ? { status: 'ok', version: '0.14.0', tools: [descriptor()] } : null,
      spawn: async () => {
        spawns += 1
        // The server the app starts again answers health from then on.
        healthy = true
        return { authToken: 'token', managed: true, disconnect: () => undefined }
      }
    })

    expect(await service.start(getStore)).toEqual({ ok: true })
    expect(spawns).toBe(1)
    healthy = false
    await waitFor(() => spawns === 2)
    // The watch queues its work behind the lifecycle; a refresh waits for it to finish.
    await service.refresh()
    expect(service.state.status).toBe('running')
    expect(service.state.failure).toBeNull()
    await service.stop()
  })

  test('leaves a server someone else runs alone', async () => {
    let spawns = 0
    const { service } = setup({
      watchIntervalMs: 20,
      readHealth: async () => null,
      spawn: async () => {
        spawns += 1
        return { authToken: 'token', managed: false, disconnect: () => undefined }
      }
    })

    await service.start(getStore)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 60)
    })
    await service.refresh()
    expect(spawns).toBe(1)
    await service.stop()
  })

  test('a server that keeps dying is reported instead of started forever', async () => {
    let healthy = true
    let spawns = 0
    const { service } = setup({
      watchIntervalMs: 5,
      restartPolicy: { baseMs: 1, attempts: 2 },
      readHealth: async () =>
        healthy ? { status: 'ok', version: '0.14.0', tools: [descriptor()] } : null,
      spawn: async () => {
        spawns += 1
        return { authToken: 'token', managed: true, disconnect: () => undefined }
      }
    })

    await service.start(getStore)
    healthy = false
    await waitFor(() => service.state.failure?.code === 'restart-exhausted')

    expect(spawns).toBe(3)
    expect(service.state.status).toBe('error')
    await service.stop()
  })

  test('a server that comes back and dies again stops being restarted', async () => {
    let healthy = true
    let spawns = 0
    const { service } = setup({
      watchIntervalMs: 5,
      restartPolicy: { baseMs: 1, attempts: 2 },
      // Longer than this test, so a healthy start does not wipe the attempt count.
      healthyResetMs: 60_000,
      readHealth: async () =>
        healthy ? { status: 'ok', version: '0.14.0', tools: [descriptor()] } : null,
      spawn: async () => {
        spawns += 1
        healthy = true
        return { authToken: 'token', managed: true, disconnect: () => undefined }
      }
    })

    await service.start(getStore)
    const kill = () => {
      healthy = false
    }
    kill()
    await waitFor(() => spawns === 2)
    await waitFor(() => service.state.status === 'running')
    kill()
    await waitFor(() => spawns === 3)
    await waitFor(() => service.state.status === 'running')
    kill()
    await waitFor(() => service.state.failure?.code === 'restart-exhausted')

    expect(spawns).toBe(3)
    await service.stop()
  })

  test('a start while a restart is waiting keeps the server that start brought up', async () => {
    vi.useFakeTimers()
    let healthy = true
    let spawns = 0
    const { calls, service } = setup({
      watchIntervalMs: 5,
      restartPolicy: { baseMs: 200, attempts: 3 },
      readHealth: async () =>
        healthy ? { status: 'ok', version: '0.14.0', tools: [descriptor()] } : null,
      spawn: async () => {
        spawns += 1
        healthy = true
        return {
          authToken: 'token',
          managed: true,
          disconnect: () => {
            calls.push('disconnect-server')
          }
        }
      }
    })

    await service.start(getStore)
    healthy = false
    await advance(5)
    expect(service.state.failure?.code).toBe('exited')
    expect(spawns).toBe(1)

    const started = await service.start(getStore)
    // The restart that was waiting would have run on this delay. It must not.
    await advance(200)

    expect(started.ok).toBe(true)
    expect(service.state.status).toBe('running')
    expect(spawns).toBe(2)
    expect(calls.filter((call) => call === 'disconnect-server')).toHaveLength(1)
    await service.stop()
  })

  test('a restart closes the connection it replaces', async () => {
    let healthy = true
    const { calls, service } = setup({
      watchIntervalMs: 5,
      restartPolicy: { baseMs: 1, attempts: 3 },
      readHealth: async () =>
        healthy ? { status: 'ok', version: '0.14.0', tools: [descriptor()] } : null,
      spawn: async () => {
        healthy = true
        return { authToken: 'token', managed: true, disconnect: () => undefined }
      }
    })

    await service.start(getStore)
    healthy = false
    await waitFor(() => calls.filter((call) => call === 'connect').length === 2)

    expect(calls).toEqual(['connect', 'disconnect-bridge', 'connect'])
    await service.stop()
  })

  test('serializes refresh behind stop so stale health cannot restore running state', async () => {
    let releaseHealth: (() => void) | undefined
    const blockedHealth = new Promise<void>((resolve) => {
      releaseHealth = resolve
    })
    let healthCalls = 0
    const { service } = setup({
      readHealth: async () => {
        healthCalls++
        if (healthCalls === 2) await blockedHealth
        return { status: 'ok', tools: [descriptor()] }
      }
    })
    await service.start(getStore)

    const refresh = service.refresh()
    const stop = service.stop()
    releaseHealth?.()
    await Promise.all([refresh, stop])

    expect(service.state.status).toBe('stopped')
  })

  test('reports startup failure and cleans up the spawned server', async () => {
    const { calls, service } = setup({ readHealth: async () => null })

    const result = await service.start(getStore)

    expect(result.ok).toBe(false)
    expect(service.state.status).toBe('error')
    expect(service.state.failure).toEqual({ code: 'unreachable', detail: expect.any(String) })
    expect(calls).toEqual(['disconnect-server'])
  })

  test('surfaces why the server could not start instead of a generic message', async () => {
    const { service } = setup({
      spawn: async () => null,
      readHealth: async () => null,
      getStartupFailure: () => ({ code: 'not-installed', detail: '@pairdraw/mcp@0.15.0' })
    })

    await service.start(getStore)

    expect(service.state.failure).toEqual({
      code: 'not-installed',
      detail: '@pairdraw/mcp@0.15.0'
    })
  })

  test('distinguishes a rejected token from a missing server', async () => {
    const { service } = setup({
      readHealth: async () => null,
      getHealthFailure: () => ({ code: 'rejected', detail: 'HTTP 401' })
    })

    await service.start(getStore)

    expect(service.state.failure).toEqual({ code: 'rejected', detail: 'HTTP 401' })
  })

  test('reports an unexpected health payload', async () => {
    const { service } = setup({
      readHealth: async () => null,
      getHealthFailure: () => ({ code: 'malformed', detail: 'HTTP 200' })
    })

    await service.start(getStore)

    expect(service.state.failure).toEqual({ code: 'malformed', detail: 'HTTP 200' })
  })

  test('clears local runtime state even when server shutdown fails', async () => {
    const { catalogs, service } = setup({
      spawn: async () => ({
        authToken: 'token',
        managed: true,
        disconnect: () => {
          throw new Error('shutdown failed')
        }
      })
    })
    await service.start(getStore)

    const result = await service.stop()

    expect(result.ok).toBe(false)
    expect(service.state.status).toBe('error')
    expect(service.state.version).toBeNull()
    expect(catalogs.at(-1)).toEqual([])
  })

  test('does not start a replacement when shutdown fails', async () => {
    let spawnCalls = 0
    const { service } = setup({
      spawn: async () => {
        spawnCalls++
        return {
          authToken: 'token',
          managed: true,
          disconnect: () => {
            throw new Error('shutdown failed')
          }
        }
      }
    })
    await service.start(getStore)

    const result = await service.restart()

    expect(result.ok).toBe(false)
    expect(spawnCalls).toBe(1)
    expect(service.state.status).toBe('error')
  })

  test('restarts with the retained editor store inside one lifecycle operation', async () => {
    const { calls, service } = setup()
    await service.start(getStore)

    expect(await service.restart()).toEqual({ ok: true })
    expect(service.state.status).toBe('running')
    expect(calls).toEqual(['connect', 'disconnect-bridge', 'disconnect-server', 'connect'])
  })
})
