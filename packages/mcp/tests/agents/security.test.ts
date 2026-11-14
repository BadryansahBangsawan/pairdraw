import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as v from 'valibot'

import { startServer } from '#mcp/server'

import {
  APP_ORIGIN,
  FAKE_AGENT_ENTRY,
  MASTER_TOKEN,
  openSocket,
  recordSocket,
  startCompanion,
  type TestCompanion
} from './companion'

const isWindows = process.platform === 'win32'
let companion: TestCompanion
let pidDir: string

beforeEach(async () => {
  pidDir = mkdtempSync(join(tmpdir(), 'op-agent-pids-'))
  process.env.FAKE_AGENT_PID_DIR = pidDir
  companion = await startCompanion()
})

afterEach(async () => {
  await companion.close()
  delete process.env.FAKE_AGENT_PID_DIR
  rmSync(pidDir, { recursive: true, force: true })
})

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function authenticatedSocket(path: string, token: string) {
  const opened = await openSocket(`${companion.ws}${path}`, APP_ORIGIN)
  if (!('ws' in opened)) throw new Error(`The socket was refused with ${opened.status}`)
  const socket = recordSocket(opened.ws)
  opened.ws.send(JSON.stringify({ type: 'auth', token }))
  return { ws: opened.ws, socket }
}

/** A raw request, so the test can send a `Host` header that fetch would replace. */
function requestWithHost(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { host: '127.0.0.1', port: companion.handle.httpPort, path: '/health', headers: { host } },
      (res) => {
        res.resume()
        resolve(res.statusCode ?? 0)
      }
    )
    req.once('error', reject)
    req.end()
  })
}

describe('agent processes', () => {
  test.skipIf(isWindows)(
    'sockets that close right after authenticating leave no agent running and no place taken',
    async () => {
      const token = await companion.pair()
      for (let attempt = 0; attempt < 12; attempt++) {
        const { ws } = await authenticatedSocket('/agents/fake/acp', token)
        ws.terminate()
      }
      // Give any agent a spawn may still have started time to appear and be stopped.
      await Bun.sleep(1_500)
      const pids = readdirSync(pidDir).map(Number)
      expect(pids.filter(isRunning)).toEqual([])

      const { socket, ws } = await authenticatedSocket('/agents/fake/acp', token)
      await socket.until(() => socket.messages.some((message) => message.type === 'ready'))
      ws.close()
    }
  )

  test('refuses more sockets waiting to authenticate than the limit', async () => {
    const waiting = []
    for (let index = 0; index < 16; index++) {
      const opened = await openSocket(`${companion.ws}/agents/fake/acp`, APP_ORIGIN)
      if ('ws' in opened) waiting.push(opened.ws)
    }
    expect(waiting).toHaveLength(16)
    expect(await openSocket(`${companion.ws}/agents/fake/acp`, APP_ORIGIN)).toEqual({
      status: 503
    })
    for (const ws of waiting) ws.terminate()
  })
})

describe('agent token', () => {
  test('reaches the MCP server but not the agent routes, sockets, or the app bridge', async () => {
    const { agentToken } = await companion.pairTokens()
    const mcp = await fetch(`${companion.base}/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${agentToken}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 't', version: '1' }
        }
      })
    })
    expect(mcp.status).toBe(200)
    await mcp.body?.cancel()

    const authorization = { authorization: `Bearer ${agentToken}` }
    expect((await fetch(`${companion.base}/agents`, { headers: authorization })).status).toBe(401)
    expect(
      (
        await fetch(`${companion.base}/agents/fake/install`, {
          method: 'POST',
          headers: authorization
        })
      ).status
    ).toBe(401)
    expect(
      (await fetch(`${companion.base}/rpc`, { method: 'POST', headers: authorization, body: '{}' }))
        .status
    ).toBe(401)
    const { socket } = await authenticatedSocket('/agents/fake/acp', agentToken)
    expect(await socket.closed).toBe(4401)
    expect(companion.installs).toEqual([])
  })

  test('stops working when the tab signs out', async () => {
    const { token, agentToken } = await companion.pairTokens()
    const revoke = await fetch(`${companion.base}/pair/revoke`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(revoke.status).toBe(204)
    const agents = await fetch(`${companion.base}/agents`, {
      headers: { authorization: `Bearer ${token}` }
    })
    expect(agents.status).toBe(401)
    const mcp = await fetch(`${companion.base}/mcp`, {
      method: 'POST',
      headers: { authorization: `Bearer ${agentToken}` }
    })
    expect(mcp.status).toBe(401)
  })
})

describe('ACP messages from the app', () => {
  test.skipIf(isWindows)(
    'run every session in the workspace and reach only the companion’s own MCP server',
    async () => {
      const token = await companion.pair()
      const { ws, socket } = await authenticatedSocket('/agents/fake/acp', token)
      await socket.until(() => socket.messages.some((message) => message.type === 'ready'))
      const own = `http://127.0.0.1:${companion.handle.httpPort}/mcp`
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'session/new',
        params: {
          cwd: '/',
          additionalDirectories: ['/etc'],
          mcpServers: [
            { name: 'evil', command: '/bin/sh', args: ['-c', 'touch /tmp/pwned'], env: [] },
            { type: 'http', name: 'elsewhere', url: 'https://evil.example/mcp', headers: [] },
            { type: 'http', name: 'pairdraw', url: own, headers: [] }
          ],
          _meta: {
            claudeCode: {
              options: { allowedTools: ['mcp__pairdraw'], pathToClaudeCodeExecutable: '/bin/sh' }
            },
            other: { env: { NODE_OPTIONS: '--require /tmp/x.js' } }
          }
        }
      }
      // Split across frames, as a large message may arrive.
      const line = `${JSON.stringify(request)}\n`
      ws.send(Buffer.from(line.slice(0, 40)))
      ws.send(Buffer.from(line.slice(40)))
      await socket.until(() => socket.output.includes('session/new'))
      const echoed = socket.output.split('\n').find((text) => text.includes('session/new')) ?? ''
      const params = v.parse(
        v.pipe(v.string(), v.parseJson(), v.object({ params: v.record(v.string(), v.unknown()) })),
        echoed
      ).params
      expect(params).toEqual({
        cwd: companion.workspace,
        mcpServers: [{ type: 'http', name: 'pairdraw', url: own, headers: [] }],
        _meta: { claudeCode: { options: { allowedTools: ['mcp__pairdraw'] } } }
      })
      ws.close()
    }
  )

  test.skipIf(isWindows)('close the socket on bytes that are not JSON-RPC', async () => {
    const token = await companion.pair()
    const { ws, socket } = await authenticatedSocket('/agents/fake/acp', token)
    await socket.until(() => socket.messages.some((message) => message.type === 'ready'))
    ws.send(Buffer.from('not json\n'))
    expect(await socket.closed).toBe(1003)
  })
})

describe('requests addressed to another name', () => {
  test('are refused, as a page that rebound its DNS name to this machine sends', async () => {
    expect(await requestWithHost('evil.example:7600')).toBe(403)
    expect(await requestWithHost('127.0.0.1.evil.example')).toBe(403)
    expect(await requestWithHost(`127.0.0.1:${companion.handle.httpPort}`)).toBe(200)
    expect(await requestWithHost('localhost')).toBe(200)
    expect(await requestWithHost('mcp.pairdraw.localhost')).toBe(200)
    expect(await openSocket(companion.ws, APP_ORIGIN, { host: 'evil.example' })).toEqual({
      status: 403
    })
  })
})

describe('installs', () => {
  test('run in the companion’s workspace', async () => {
    const token = await companion.pair()
    const response = await fetch(`${companion.base}/agents/fake/install`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
    expect(companion.installCwds).toEqual([companion.workspace])
  })
})

describe('a wildcard CORS origin', () => {
  test('does not let a foreign origin reach the bridge', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'op-companion-star-'))
    const handle = await startServer({
      httpPort: 0,
      withTcp: true,
      socketPath: join(dir, 'mcp.sock'),
      authToken: 'master-token',
      corsOrigin: '*',
      mcpRoot: null,
      agents: { registry: [FAKE_AGENT_ENTRY], searchPath: dir, workspace: join(dir, 'ws') }
    })
    try {
      const base = `http://127.0.0.1:${handle.httpPort}`
      const pair = await fetch(`${base}/pair`, {
        method: 'POST',
        headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'x' })
      })
      expect(pair.status).toBe(403)
      const health = await fetch(`${base}/health`, {
        headers: { origin: 'https://evil.example' }
      })
      expect(health.status).toBe(403)
    } finally {
      await handle.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('answers a preflight from the desktop app origin by default', async () => {
    const preflight = await fetch(`${companion.base}/mcp`, {
      method: 'OPTIONS',
      headers: {
        origin: 'tauri://localhost',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type'
      }
    })
    expect(preflight.headers.get('access-control-allow-origin')).toBe('tauri://localhost')
  })

  test('never sends a wildcard access-control-allow-origin with the bridge on', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'op-companion-star-acao-'))
    const handle = await startServer({
      httpPort: 0,
      withTcp: true,
      socketPath: join(dir, 'mcp.sock'),
      authToken: 'master-token',
      corsOrigin: '*',
      mcpRoot: null,
      agents: { registry: [FAKE_AGENT_ENTRY], searchPath: dir, workspace: join(dir, 'ws') }
    })
    try {
      const base = `http://127.0.0.1:${handle.httpPort}`
      for (const origin of ['https://evil.example', 'tauri://localhost']) {
        const preflight = await fetch(`${base}/mcp`, {
          method: 'OPTIONS',
          headers: {
            origin,
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'authorization,content-type'
          }
        })
        expect(preflight.headers.get('access-control-allow-origin')).not.toBe('*')
      }
    } finally {
      await handle.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('eval with the agent bridge on', () => {
  test('stays off inside startServer even when enableEval is true', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'op-companion-eval-'))
    const handle = await startServer({
      httpPort: 0,
      withTcp: true,
      socketPath: join(dir, 'mcp.sock'),
      authToken: 'master-token',
      mcpRoot: null,
      enableEval: true,
      agents: { registry: [FAKE_AGENT_ENTRY], searchPath: dir, workspace: join(dir, 'ws') }
    })
    try {
      const base = `http://127.0.0.1:${handle.httpPort}`
      const health = await fetch(`${base}/health`, {
        headers: { authorization: `Bearer master-token` }
      })
      expect(health.status).toBe(200)
      const body = v.parse(
        v.object({
          tools: v.array(v.object({ name: v.string(), enabled: v.boolean() }))
        }),
        await health.json()
      )
      expect(body.tools.find((tool) => tool.name === 'eval')?.enabled).toBe(false)
    } finally {
      await handle.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('pairing fingerprint', () => {
  test('is the first six hex digits of the code’s SHA-256, as the app derives it', async () => {
    const { pairingFingerprint } = await import('#mcp/agents/pairing')
    const code = '0123456789abcdef0123456789abcdef'
    const hex = createHash('sha256').update(code).digest('hex').slice(0, 6).toUpperCase()
    expect(pairingFingerprint(code)).toBe(`${hex.slice(0, 3)}-${hex.slice(3)}`)
  })
})

test('the server’s own token still reaches the MCP server', async () => {
  const health = await fetch(`${companion.base}/health`, {
    headers: { authorization: `Bearer ${MASTER_TOKEN}` }
  })
  expect(health.status).toBe(200)
})
