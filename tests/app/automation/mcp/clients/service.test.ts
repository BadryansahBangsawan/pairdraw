import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { MCP_CLIENTS } from '@/app/automation/mcp/clients/catalog'
import type { MCPClient, MCPClientID } from '@/app/automation/mcp/clients/catalog'
import { inspectClient, setClientEntry } from '@/app/automation/mcp/clients/service'
import type { MCPClientConfigStore } from '@/app/automation/mcp/clients/service'

function client(id: MCPClientID): MCPClient {
  const found = MCP_CLIENTS.find((item) => item.id === id)
  if (!found) throw new Error(`no ${id}`)
  return found
}

const serversFileSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({ mcpServers: v.record(v.string(), v.unknown()) })
)

interface FakeFile {
  installed: boolean
  content: string | null
}

/** A store over in-memory files that, like the shell, writes only over the text it was given. */
function fakeStore(files: Partial<Record<MCPClientID, FakeFile>>) {
  const writes: { client: MCPClientID; content: string }[] = []
  let interfere: ((file: FakeFile) => void) | undefined
  const store: MCPClientConfigStore = {
    read: async (id) => {
      const file = files[id]
      if (!file) throw new Error('unreadable')
      return { displayPath: `~/${id}`, installed: file.installed, content: file.content }
    },
    write: async (id, _enabled, content, expected) => {
      const file = files[id]
      if (!file) throw new Error('write-failed')
      interfere?.(file)
      interfere = undefined
      if (file.content !== expected) throw new Error('changed')
      const backup = file.content === null ? null : `~/${id}.open-pencil.bak`
      file.content = content
      writes.push({ client: id, content })
      return { backup }
    }
  }
  return {
    store,
    writes,
    interfereOnce: (change: (file: FakeFile) => void) => {
      interfere = change
    }
  }
}

describe('MCP client setup', () => {
  test('reports each client as its file stands', async () => {
    const { store } = fakeStore({
      cursor: {
        installed: true,
        content: '{"mcpServers":{"open-pencil":{"command":"openpencil-mcp"}}}'
      },
      kiro: { installed: false, content: null }
    })
    expect(await inspectClient(store, client('cursor'))).toMatchObject({
      installed: true,
      state: 'added',
      displayPath: '~/cursor'
    })
    expect(await inspectClient(store, client('kiro'))).toMatchObject({
      installed: false,
      state: 'absent'
    })
    expect(await inspectClient(store, client('codex'))).toMatchObject({ state: 'unreadable' })
  })

  test('adds the entry and reports the backup the first change made', async () => {
    const { store, writes } = fakeStore({ 'gemini-cli': { installed: true, content: '{}' } })
    const change = await setClientEntry(store, client('gemini-cli'), true)
    expect(change).toMatchObject({
      outcome: 'saved',
      backup: '~/gemini-cli.open-pencil.bak',
      status: { state: 'added' }
    })
    expect(writes).toHaveLength(1)
  })

  test('edits again from the new text when the file changed under the edit', async () => {
    const files = { cursor: { installed: true, content: '{"mcpServers": {}}' } }
    const { store, interfereOnce } = fakeStore(files)
    interfereOnce((file) => {
      file.content = '{"mcpServers": {"mine": {"command": "x"}}}'
    })
    const change = await setClientEntry(store, client('cursor'), true)
    expect(change).toMatchObject({ outcome: 'saved', status: { state: 'added' } })
    const saved = v.parse(serversFileSchema, files.cursor.content)
    expect(Object.keys(saved.mcpServers)).toEqual(['mine', 'open-pencil'])
  })

  test('does not write when nothing changes, the client is missing, or the file is broken', async () => {
    const { store, writes } = fakeStore({
      cursor: { installed: true, content: '{}' },
      kiro: { installed: false, content: null },
      'vs-code': { installed: true, content: '{ broken' }
    })
    expect(await setClientEntry(store, client('cursor'), false)).toMatchObject({ outcome: 'saved' })
    expect(await setClientEntry(store, client('kiro'), true)).toMatchObject({
      outcome: 'failed',
      reason: 'not-installed'
    })
    expect(await setClientEntry(store, client('vs-code'), true)).toMatchObject({
      outcome: 'failed',
      reason: 'invalid'
    })
    expect(writes).toHaveLength(0)
  })

  test('reports a write the shell refused, and asks it for the switch it was given', async () => {
    const asked: boolean[] = []
    for (const reason of ['write-failed', 'refused', 'invalid'] as const) {
      const store: MCPClientConfigStore = {
        read: async () => ({ displayPath: '~/x', installed: true, content: null }),
        write: async (_id, enabled) => {
          asked.push(enabled)
          throw new Error(reason)
        }
      }
      expect(await setClientEntry(store, client('cursor'), true)).toMatchObject({
        outcome: 'failed',
        reason
      })
    }
    expect(asked).toEqual([true, true, true])
  })
})
