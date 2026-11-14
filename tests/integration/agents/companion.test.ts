import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type SessionNotification
} from '@agentclientprotocol/sdk'

import { ACP_AGENTS } from '@pairdraw/core/constants'

import { createCompanionAgentHost } from '@/app/ai/agents/host/companion'
import { createCompanionConnection } from '@/app/automation/companion/connection'

import { startServer, type ServerHandle } from '#mcp/server'

import { expectDefined } from '#tests/helpers/assert'
import { testPath } from '#tests/helpers/paths'

/**
 * The browser's agent host and the companion together: the app pairs, looks the agent up, starts
 * it over the companion's socket, and holds an ACP conversation with it.
 */
const isWindows = process.platform === 'win32'
const claude = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'claude-code'),
  'Claude Code'
)
const FAKE_AGENT = testPath('helpers/agents/acp-agent.ts')

let dir: string
let server: ServerHandle

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'op-companion-chat-'))
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  const wrapper = join(bin, 'fake-acp')
  writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_AGENT}" "$@"\n`)
  chmodSync(wrapper, 0o755)
  server = await startServer({
    httpPort: 0,
    withTcp: true,
    socketPath: join(dir, 'mcp.sock'),
    mcpRoot: null,
    agents: {
      // The app asks for Claude Code by its id; the registry starts the stand-in for it.
      registry: [{ id: claude.id, command: 'fake-acp', args: [] }],
      searchPath: bin,
      workspace: join(dir, 'workspace')
    }
  })
})

afterEach(async () => {
  await server.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('coding agents through the companion', () => {
  test.skipIf(isWindows)('a paired tab chats with an agent the companion started', async () => {
    const connection = createCompanionConnection()
    const issue = expectDefined(server.issuePairingCode, 'pairing')
    expect(await connection.pair({ code: issue(), port: server.httpPort })).toBe(true)
    const host = createCompanionAgentHost(connection)

    const lookup = await host.detect()
    expect(lookup.executables['fake-acp']).toEndWith('fake-acp')
    expect(await host.workspace()).toBe(join(dir, 'workspace'))

    const agent = await host.spawn(claude)
    const updates: SessionNotification[] = []
    const client = new ClientSideConnection(
      () => ({
        requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
        sessionUpdate: async (params) => {
          updates.push(params)
        }
      }),
      ndJsonStream(agent.input, agent.output)
    )
    const init = await client.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {}
    })
    expect(init.agentInfo?.name).toBe('fake-acp')
    const { sessionId } = await client.newSession({ cwd: await host.workspace(), mcpServers: [] })
    const reply = await client.prompt({ sessionId, prompt: [{ type: 'text', text: 'hello' }] })
    expect(reply.stopReason).toBe('end_turn')
    expect(updates.map(({ update }) => update)).toContainEqual({
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'echo: hello' }
    })
    await agent.close()
  })

  test('refuses a tab whose token the companion never issued', async () => {
    const host = createCompanionAgentHost({
      url: () => `http://127.0.0.1:${server.httpPort}`,
      token: () => 'never-issued'
    })
    await expect(host.detect()).rejects.toThrow('not connected')
    await expect(host.spawn(claude)).rejects.toThrow('not connected')
  })
})
