import { afterEach, describe, expect, test, vi } from 'bun:test'
import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { PassThrough, type Readable } from 'node:stream'

import { automationPlugin } from '@/app/automation/bridge/vite-plugin'

import { asDouble } from '#tests/helpers/doubles'

const originalFetch = globalThis.fetch

/**
 * The plugin's health check waits on this. Resolving it is the stand-in for a healthy server,
 * and the test does that only after it has seen the request, so a later crash is of a child
 * that finished starting.
 */
let healthWait: ((response: Response) => void) | null = null
let healthCaller: (() => void) | null = null

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.useRealTimers()
  healthWait = null
  healthCaller = null
})

type SpawnedChild = ChildProcess & { stderr: Readable }

function installFetch(): void {
  globalThis.fetch = asDouble<typeof fetch>(
    () =>
      new Promise((resolve) => {
        healthWait = resolve
        const caller = healthCaller
        healthCaller = null
        caller?.()
      })
  )
}

/** Lets the plugin's health check succeed, then lets that start finish before returning. */
async function acceptHealth(): Promise<void> {
  if (!healthWait) {
    await new Promise<void>((resolve) => {
      healthCaller = resolve
    })
  }
  const resolve = healthWait
  healthWait = null
  if (!resolve) throw new Error('the plugin did not ask for a health check')
  resolve(new Response(null, { status: 200 }))
  // Resolving the check queues the plugin's continuation, which records the healthy start.
  await new Promise<void>((resolveTurn) => {
    queueMicrotask(resolveTurn)
  })
}

/** Lets the start that just accepted health finish on its microtasks. */
async function settleStarted(): Promise<void> {
  for (let turn = 0; turn < 5; turn++) {
    await Promise.resolve()
  }
}

function pluginOptions(spawnProcess: (env: NodeJS.ProcessEnv) => SpawnedChild) {
  return {
    browserURL: 'http://127.0.0.1:9',
    corsOrigin: 'http://127.0.0.1:9',
    httpPort: 9,
    portlessServiceName: null,
    runtimeId: `dev-restart-${crypto.randomUUID()}`,
    restartPolicy: { baseMs: 5, attempts: 3 },
    spawnProcess: (
      _command: string,
      _args: readonly string[],
      options: { env: NodeJS.ProcessEnv }
    ) => spawnProcess(options.env)
  }
}

/** A child that prints the readiness marker the plugin put in its environment. */
function fakeChild(env: NodeJS.ProcessEnv): SpawnedChild {
  // ChildProcess is an EventEmitter. Readiness removes its exit listener with `.off`.
  // oxlint-disable-next-line unicorn/prefer-event-target
  const emitter = new EventEmitter()
  const stderr = new PassThrough()
  const marker = env.PAIRDRAW_MCP_READY_MARKER
  const child = Object.assign(emitter, {
    stderr,
    stdout: new PassThrough(),
    stdin: null,
    exitCode: null,
    signalCode: null,
    pid: 1,
    kill() {
      queueMicrotask(() => {
        emitter.emit('exit', 0, null)
      })
      return true
    }
  })
  if (typeof marker === 'string') queueMicrotask(() => stderr.write(`${marker}\n`))
  return asDouble<SpawnedChild>(child)
}

/**
 * Spawn calls resolve a promise the test is already waiting on. The plugin attaches the exit
 * listener before that promise resumes, so the test can crash the child it just received.
 */
function trackChildren() {
  const children: SpawnedChild[] = []
  let waiting: { count: number; resolve: () => void } | null = null

  function notify(): void {
    if (!waiting || children.length < waiting.count) return
    const resolve = waiting.resolve
    waiting = null
    resolve()
  }

  return {
    children,
    spawn(env: NodeJS.ProcessEnv): SpawnedChild {
      const child = fakeChild(env)
      children.push(child)
      notify()
      return child
    },
    spawned(count: number): Promise<void> {
      if (children.length >= count) return Promise.resolve()
      if (waiting) throw new Error('already waiting for a child')
      return new Promise((resolve) => {
        waiting = { count, resolve }
      })
    }
  }
}

function crash(child: SpawnedChild | undefined): void {
  if (!child) throw new Error('the plugin has no child to crash')
  child.emit('exit', 1, null)
}

/**
 * A timer that this advance made due is what starts the next child. Waiting for that spawn
 * covers the mkdir the timer kicked off, which is still in flight when the advance returns.
 */
async function awaitSpawnIfTimerFired(
  armed: number,
  gate: ReturnType<typeof trackChildren>,
  count: number
): Promise<void> {
  if (vi.getTimerCount() < armed) await gate.spawned(count)
}

function isAttemptReport(argument: unknown): argument is { attempts: number } {
  if (typeof argument !== 'object' || argument === null) return false
  if (!('attempts' in argument)) return false
  return typeof argument.attempts === 'number'
}

function reportedAttempts(calls: ReadonlyArray<ReadonlyArray<unknown>>): number[] {
  return calls.flatMap((call) =>
    call.flatMap((argument) => (isAttemptReport(argument) ? [argument.attempts] : []))
  )
}

async function startPlugin(spawnProcess: (env: NodeJS.ProcessEnv) => SpawnedChild) {
  installFetch()
  const plugin = automationPlugin('token', pluginOptions(spawnProcess))
  const configure = plugin.configureServer
  if (typeof configure !== 'function') throw new Error('The plugin does not configure a server')
  const starting = configure.call(
    asDouble<ThisParameterType<typeof configure>>({}),
    asDouble({
      middlewares: {
        use() {
          return undefined
        }
      }
    })
  )
  await acceptHealth()
  await starting
  return plugin
}

function stopPlugin(plugin: ReturnType<typeof automationPlugin>) {
  const buildEnd = plugin.buildEnd
  if (typeof buildEnd !== 'function') throw new Error('The plugin does not stop its child')
  return buildEnd.call(asDouble<ThisParameterType<typeof buildEnd>>({}))
}

describe('development MCP restart wiring', () => {
  test('a child that dies is started again', async () => {
    const gate = trackChildren()
    const plugin = await startPlugin(gate.spawn)

    expect(gate.children).toHaveLength(1)
    const again = gate.spawned(2)
    crash(gate.children[0])
    await again
    await acceptHealth()

    expect(gate.children).toHaveLength(2)
    await stopPlugin(plugin)
  })

  test('a child stopped on purpose is not started again', async () => {
    vi.useFakeTimers()
    const gate = trackChildren()
    const plugin = await startPlugin(gate.spawn)

    await stopPlugin(plugin)
    const armed = vi.getTimerCount()
    vi.advanceTimersByTime(50)
    await awaitSpawnIfTimerFired(armed, gate, 2)

    expect(gate.children).toHaveLength(1)
  })

  test('giving up names how many restarts were used', async () => {
    // The restart waits are this test's only wall-clock dependency. Starts still do real file
    // and pipe work, so every spawn is awaited before the next clock advance.
    vi.useFakeTimers()
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const gate = trackChildren()
    try {
      const plugin = await startPlugin(gate.spawn)

      for (const [index, delay] of [5, 10, 20].entries()) {
        crash(gate.children.at(-1))
        await vi.advanceTimersByTime(delay)
        await gate.spawned(index + 2)
        await acceptHealth()
        await settleStarted()
      }
      crash(gate.children.at(-1))

      expect(reportedAttempts(logged.mock.calls)).toEqual([3])
      expect(gate.children).toHaveLength(4)
      // A wrongly planned next attempt would start within the third wait (20 ms).
      await vi.advanceTimersByTime(30)
      expect(gate.children).toHaveLength(4)
      await stopPlugin(plugin)
    } finally {
      logged.mockRestore()
    }
  })
})
