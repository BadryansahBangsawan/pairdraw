import { describe, expect, test } from 'bun:test'

import { MCP_CLIENTS } from '@/app/automation/mcp/clients/catalog'
import type { MCPClientID } from '@/app/automation/mcp/clients/catalog'
import type { MCPClientConfigStore } from '@/app/automation/mcp/clients/service'
import { createMCPClientSetup } from '@/app/automation/mcp/clients/settings/use'
import { createDeferred } from '@/app/runtime/deferred'

/** Every client set up, with an empty config, except those named in `files`. */
function store(files: Partial<Record<MCPClientID, string | null>> = {}): MCPClientConfigStore {
  const content = new Map<MCPClientID, string | null>(
    MCP_CLIENTS.map((client) => [client.id, files[client.id] ?? null])
  )
  return {
    read: async (id) => ({ displayPath: `~/${id}`, installed: true, content: content.get(id) }),
    write: async (id, _enabled, text, expected) => {
      if ((content.get(id) ?? null) !== expected) throw new Error('changed')
      content.set(id, text)
      return { backup: null }
    }
  }
}

describe('MCP client switches', () => {
  test('lists every client and turns one on', async () => {
    const setup = createMCPClientSetup(async () => store())
    await setup.refresh()
    expect(setup.clients.value.map((status) => status.id)).toEqual(
      MCP_CLIENTS.map((client) => client.id)
    )
    expect(setup.clients.value.every((status) => status.state === 'absent')).toBe(true)

    await setup.toggle('cursor', true)
    expect(setup.clients.value.find((status) => status.id === 'cursor')?.state).toBe('added')
    expect(setup.notice.value).toMatchObject({ client: 'cursor', change: { outcome: 'saved' } })
    expect(setup.pending.value).toBeNull()
  })

  test('a read that finishes after a switch does not undo what the switch showed', async () => {
    const files = store()
    const slowRead = createDeferred<undefined>()
    const perRefresh = MCP_CLIENTS.length
    let reads = 0
    const setup = createMCPClientSetup(async () => ({
      ...files,
      read: async (id) => {
        // The second refresh's reads hang until the switch has finished.
        const read = ++reads
        const config = await files.read(id)
        if (read > perRefresh && read <= 2 * perRefresh) await slowRead.promise
        return config
      }
    }))
    await setup.refresh()
    const stale = setup.refresh()
    await setup.toggle('kiro', true)
    slowRead.resolve(undefined)
    await stale
    expect(setup.clients.value.find((status) => status.id === 'kiro')?.state).toBe('added')
    expect(setup.loading.value).toBe(false)
  })

  test('shows every client as unreadable when the shell cannot be reached', async () => {
    const setup = createMCPClientSetup(() => Promise.reject(new Error('no shell')))
    await setup.refresh()
    expect(setup.clients.value.every((status) => status.state === 'unreadable')).toBe(true)
  })
})
