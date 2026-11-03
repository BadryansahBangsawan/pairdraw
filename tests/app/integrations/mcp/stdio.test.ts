import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { connectMCPClient, defaultMCPConnectDependencies } from '@/app/integrations/mcp/client'
import {
  isAllowedMCPEnvName,
  parseMCPArguments,
  parseMCPEnvironment
} from '@/app/integrations/mcp/stdio/env'
import type {
  MCPStdioEvent,
  MCPStdioNative,
  MCPStdioSpawnRequest
} from '@/app/integrations/mcp/stdio/native'
import { NativeStdioTransport } from '@/app/integrations/mcp/stdio/transport'
import type { MCPConnection } from '@/app/integrations/mcp/types'

import { createTestMCPServer } from '#tests/helpers/mcp/external-server'

/** Stands in for the desktop shell: a process whose stdin goes to the test server. */
function fakeShell(options: { noise?: string } = {}) {
  const server = createTestMCPServer([{ name: 'read_file', call: () => ({ content: [] }) }])
  const spawned: MCPStdioSpawnRequest[] = []
  const written: string[] = []
  let emit: (event: MCPStdioEvent) => void = () => undefined
  const native: MCPStdioNative = {
    async approve(request) {
      return request.command
    },
    async spawn(request, onEvent) {
      spawned.push(request)
      emit = onEvent
      if (options.noise) queueMicrotask(() => emit({ kind: 'message', line: options.noise ?? '' }))
      return 7
    },
    async write(_handle, line) {
      written.push(line)
      const reply = server.answer(v.parse(v.pipe(v.string(), v.parseJson()), line.trim()))
      if (reply) queueMicrotask(() => emit({ kind: 'message', line: JSON.stringify(reply) }))
    },
    async close() {
      queueMicrotask(() => emit({ kind: 'exit', code: 0 }))
    }
  }
  return { native, spawned, written, exit: (code: number) => emit({ kind: 'exit', code }) }
}

const local: MCPConnection = {
  id: 'mcp-files',
  name: 'Files',
  enabled: true,
  transport: { type: 'stdio', command: 'npx', args: ['-y', 'server'], envNames: ['TOKEN'] },
  authentication: { type: 'none' }
}

describe('local MCP servers on the desktop', () => {
  test('starts the approved command with its variables and speaks JSON-RPC lines', async () => {
    const shell = fakeShell()
    const session = await connectMCPClient(local, {
      ...defaultMCPConnectDependencies,
      desktop: () => true,
      stdio: shell.native,
      env: async () => ({ TOKEN: 'secret' })
    })
    try {
      const { tools } = await session.client.listTools()
      expect(tools.map((tool) => tool.name)).toEqual(['read_file'])
      expect(shell.spawned).toHaveLength(1)
      expect(shell.spawned[0]).toMatchObject({
        connectionId: 'mcp-files',
        command: 'npx',
        args: ['-y', 'server'],
        env: [{ name: 'TOKEN', value: 'secret' }],
        // Only picks the shell's own wording of the approval dialog.
        locale: 'en'
      })
      expect(shell.written.every((line) => line.endsWith('\n'))).toBeTrue()
    } finally {
      await session.close()
    }
  })

  test('reports a stray stdout line without dropping the connection', async () => {
    const errors: Error[] = []
    const shell = fakeShell({ noise: 'Server listening…' })
    const transport = new NativeStdioTransport(
      {
        connectionId: 'mcp-files',
        name: 'Files',
        command: 'npx',
        args: [],
        env: [],
        locale: 'en'
      },
      shell.native
    )
    transport.onerror = (error) => errors.push(error)
    let closed = false
    transport.onclose = () => {
      closed = true
    }
    await transport.start()
    await Promise.resolve()
    expect(errors).toHaveLength(1)
    expect(closed).toBeFalse()
    shell.exit(1)
    expect(closed).toBeTrue()
    await expect(transport.send({ jsonrpc: '2.0', id: 1, method: 'ping' })).rejects.toThrow(
      'not running'
    )
  })
})

describe('local command settings', () => {
  test('reads NAME=value lines and refuses variables that load code', () => {
    expect(parseMCPEnvironment('# comment\nTOKEN = abc\n\nURL=https://x?a=b')).toEqual({
      TOKEN: 'abc',
      URL: 'https://x?a=b'
    })
    expect(parseMCPEnvironment('')).toEqual({})
    expect(parseMCPEnvironment('NODE_OPTIONS=--require x')).toBeNull()
    expect(parseMCPEnvironment('no separator')).toBeNull()
    expect(parseMCPEnvironment('A=1\nA=2')).toBeNull()
    expect(isAllowedMCPEnvName('dyld_insert_libraries')).toBeFalse()
    expect(isAllowedMCPEnvName('GITHUB_TOKEN')).toBeTrue()
  })

  test('takes one argument per line, so spaces need no quoting', () => {
    expect(parseMCPArguments('-y\n  @scope/server  \n\n/Users/me/My Designs\n')).toEqual([
      '-y',
      '@scope/server',
      '/Users/me/My Designs'
    ])
  })
})
