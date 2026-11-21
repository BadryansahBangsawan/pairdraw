import { describe, expect, mock, test } from 'bun:test'

import { ref } from 'vue'

import type { AgentLookup } from '@/app/ai/agents/setup/native'
import { createCompanionUpdate } from '@/app/ai/agents/setup/update'
import { createDeferred } from '@/app/runtime/deferred'

const APP = '0.19.0'

/** What the computer reports: each companion's program, its package's version, and the tools. */
function computer(
  installed: { program: string; path: string; packageName?: string; version?: string | null }[],
  extra: Partial<AgentLookup> = {}
): AgentLookup {
  return {
    searchPath: '/test/bin',
    executables: Object.fromEntries(installed.map(({ program, path }) => [program, path])),
    versions: Object.fromEntries(
      installed.flatMap(({ packageName, version = null }) =>
        packageName ? [[packageName, version]] : []
      )
    ),
    ...extra
  }
}

const npm = { program: 'npm', path: '/usr/local/bin/npm' }
const bun = { program: 'bun', path: '/home/me/.bun/bin/bun' }
const mcp = (version: string | null, path = '/usr/local/bin/pairdraw-mcp-http') => ({
  program: 'pairdraw-mcp-http',
  path,
  packageName: '@pairdraw/mcp',
  version
})
const cli = (version: string | null, path = '/usr/local/bin/pairdraw') => ({
  program: 'pairdraw',
  path,
  packageName: '@pairdraw/cli',
  version
})
const harness = (version: string | null, path = '/usr/local/bin/pairdraw-harness') => ({
  program: 'pairdraw-harness',
  path,
  packageName: '@pairdraw/harness',
  version
})

type Install = { companion: string; manager: string }

/** A computer whose installs set the companion to the app's version, unless told to fail. */
function host(before: AgentLookup, { fails = [] as string[] } = {}) {
  let current = structuredClone(before)
  const installs: Install[] = []
  const packages: Record<string, string> = {
    mcp: '@pairdraw/mcp',
    cli: '@pairdraw/cli',
    harness: '@pairdraw/harness'
  }
  return {
    installs,
    detect: mock(async () => structuredClone(current)),
    install: mock(
      async (
        target: { kind: 'adapter' } | { kind: 'companion'; companion: 'mcp' | 'cli' | 'harness' },
        { manager }: { searchPath: string; manager: 'npm' | 'bun' }
      ) => {
        if (target.kind !== 'companion') throw new Error('Only companions update.')
        installs.push({ companion: target.companion, manager })
        if (fails.includes(target.companion)) throw new Error('npm failed')
        current = {
          ...current,
          versions: { ...current.versions, [packages[target.companion]]: APP }
        }
      }
    )
  }
}

function update(computerHost: ReturnType<typeof host>, updatedFor = ref<string | null>(null)) {
  return createCompanionUpdate(computerHost, {
    enabled: true,
    appVersion: APP,
    updatedFor,
    refresh: async () => undefined,
    restartBridge: async () => undefined
  })
}

describe('companion update', () => {
  test('updates each installed companion that differs from the app with the manager that installed it', async () => {
    const computerHost = host(
      computer([npm, bun, mcp('0.18.0'), cli('0.18.0', '/home/me/.bun/bin/pairdraw'), harness(APP)])
    )
    const companions = update(computerHost)
    await companions.run()
    expect(computerHost.installs).toEqual([
      { companion: 'mcp', manager: 'npm' },
      { companion: 'cli', manager: 'bun' }
    ])
    expect(companions.state.value).toBe('updated')
  })

  test('never installs a companion that is not installed', async () => {
    // On Linux the desktop app's own program is also `pairdraw`; it has no CLI package.
    const computerHost = host(computer([npm, { program: 'pairdraw', path: '/usr/bin/pairdraw' }]))
    const companions = update(computerHost)
    await companions.run()
    expect(computerHost.installs).toEqual([])
    expect(companions.state.value).toBe('idle')
  })

  test('updates a server too old to report its version', async () => {
    const computerHost = host(computer([npm, mcp(null)]))
    await update(computerHost).run()
    expect(computerHost.installs).toEqual([{ companion: 'mcp', manager: 'npm' }])
  })

  test('leaves to guided setup what needs administrator rights or a missing manager', async () => {
    const computerHost = host(
      computer([npm, mcp('0.18.0'), cli('0.18.0', '/home/me/.bun/bin/pairdraw')], {
        npmGlobalWritable: false
      })
    )
    const companions = update(computerHost)
    await companions.run()
    expect(computerHost.installs).toEqual([])
    expect(companions.state.value).toBe('idle')
  })

  test('runs once per app version, even after it failed', async () => {
    const updatedFor = ref<string | null>(null)
    const computerHost = host(computer([npm, mcp('0.18.0'), cli('0.18.0')]), { fails: ['mcp'] })
    const companions = update(computerHost, updatedFor)
    await companions.run()
    // One failure does not stop the others.
    expect(computerHost.installs.map(({ companion }) => companion)).toEqual(['mcp', 'cli'])
    expect(companions.state.value).toBe('failed')
    await companions.run()
    await update(computerHost, updatedFor).run()
    expect(computerHost.installs).toHaveLength(2)
    // The next version tries again.
    updatedFor.value = '0.18.0'
    await update(computerHost, updatedFor).run()
    expect(computerHost.installs).toHaveLength(3)
  })

  test('fails when the old copy still answers after the install', async () => {
    const computerHost = host(computer([npm, mcp('0.18.0')]))
    computerHost.install.mockImplementation(async () => undefined)
    const companions = update(computerHost)
    await companions.run()
    expect(companions.state.value).toBe('failed')
  })

  test('restarts the MCP server only when it was updated, after setup looks again', async () => {
    const calls: string[] = []
    const run = (lookup: AgentLookup) =>
      createCompanionUpdate(host(lookup), {
        enabled: true,
        appVersion: APP,
        updatedFor: ref<string | null>(null),
        refresh: async () => {
          calls.push('refresh')
        },
        restartBridge: async () => {
          calls.push('restart')
        }
      }).run()
    await run(computer([npm, cli('0.18.0')]))
    expect(calls).toEqual(['refresh'])
    calls.length = 0
    await run(computer([npm, mcp('0.18.0')]))
    expect(calls).toEqual(['refresh', 'restart'])
  })

  test('reports the update while it runs and settles once it finishes', async () => {
    const computerHost = host(computer([npm, mcp('0.18.0')]))
    const started = createDeferred<undefined>()
    const finish = createDeferred<undefined>()
    const install = computerHost.install.getMockImplementation()
    computerHost.install.mockImplementation(async (...args) => {
      started.resolve(undefined)
      await finish.promise
      return install?.(...args)
    })
    const companions = update(computerHost)
    const running = companions.run()
    let settled = false
    void companions.settled().then(() => {
      settled = true
      return undefined
    })
    await started.promise
    expect(companions.state.value).toBe('updating')
    expect(settled).toBe(false)
    finish.resolve(undefined)
    await running
    await companions.settled()
    expect(settled).toBe(true)
    expect(companions.state.value).toBe('updated')
  })

  test('does nothing where companions cannot be installed', async () => {
    const computerHost = host(computer([npm, mcp('0.18.0')]))
    const updatedFor = ref<string | null>(null)
    await createCompanionUpdate(computerHost, {
      enabled: false,
      appVersion: APP,
      updatedFor,
      refresh: async () => undefined,
      restartBridge: async () => undefined
    }).run()
    expect(computerHost.detect).not.toHaveBeenCalled()
    expect(updatedFor.value).toBeNull()
  })
})
