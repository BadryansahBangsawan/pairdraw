import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as v from 'valibot'

import { devAgentBridgeFromEnv } from '#mcp/agents/index'

import {
  APP_ORIGIN,
  MASTER_TOKEN,
  openSocket,
  recordSocket,
  startCompanion,
  type TestCompanion
} from './companion'

const isWindows = process.platform === 'win32'
let companion: TestCompanion

beforeEach(async () => {
  companion = await startCompanion()
})

afterEach(async () => {
  await companion.close()
})

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function openAgentSocket(path: string, token: string) {
  const opened = await openSocket(`${companion.ws}${path}`, APP_ORIGIN)
  if (!('ws' in opened)) throw new Error(`The socket was refused with ${opened.status}`)
  const socket = recordSocket(opened.ws)
  opened.ws.send(JSON.stringify({ type: 'auth', token }))
  return { ws: opened.ws, socket }
}

describe('pairing over HTTP', () => {
  test('a code pairs once, and only a session token reaches the agent routes', async () => {
    const token = await companion.pair()
    const agents = (authorization: string | null) =>
      fetch(`${companion.base}/agents`, {
        headers: authorization ? { authorization: `Bearer ${authorization}` } : {}
      })
    expect((await agents(token)).status).toBe(200)
    expect((await agents(null)).status).toBe(401)
    // The MCP server's own token, which local MCP clients read, does not start programs.
    expect((await agents(MASTER_TOKEN)).status).toBe(401)
  })

  test('rejects a wrong or reused code', async () => {
    const issue = companion.handle.issuePairingCode
    if (!issue) throw new Error('No agent bridge')
    const code = issue()
    const pair = (body: string) =>
      fetch(`${companion.base}/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body
      })
    expect((await pair(JSON.stringify({ code: 'wrong' }))).status).toBe(401)
    expect((await pair(JSON.stringify({ code }))).status).toBe(200)
    expect((await pair(JSON.stringify({ code }))).status).toBe(401)
    expect((await pair('{not json')).status).toBe(400)
    expect((await pair(JSON.stringify({ code: 7 }))).status).toBe(400)
  })

  test('a paired tab reaches the MCP routes with its session token', async () => {
    const token = await companion.pair()
    const response = await fetch(`${companion.base}/rpc`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: '[]'
    })
    expect(response.status).toBe(400)
  })

  test('the lookup reports the agents and this server as the MCP companion', async () => {
    const token = await companion.pair()
    const response = await fetch(`${companion.base}/agents`, {
      headers: { authorization: `Bearer ${token}` }
    })
    const lookup = v.parse(
      v.pipe(
        v.string(),
        v.parseJson(),
        v.object({
          executables: v.record(v.string(), v.nullable(v.string())),
          versions: v.record(v.string(), v.nullable(v.string()))
        })
      ),
      await response.text()
    )
    expect(lookup.executables['fake-acp']).toEndWith('fake-acp')
    expect(lookup.executables['pairdraw-mcp-http']).toBeTruthy()
    expect(lookup.versions['@pairdraw/mcp']).toBeTruthy()
  })
})

describe('origin policy', () => {
  test('refuses requests and sockets from other sites, including the app bridge', async () => {
    const foreign = 'https://evil.example'
    const pair = await fetch(`${companion.base}/pair`, {
      method: 'POST',
      headers: { origin: foreign, 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'x' })
    })
    expect(pair.status).toBe(403)
    const health = await fetch(`${companion.base}/health`, { headers: { origin: foreign } })
    expect(health.status).toBe(403)
    expect(await openSocket(companion.ws, foreign)).toEqual({ status: 403 })
    expect(await openSocket(`${companion.ws}/agents/fake/acp`, foreign)).toEqual({ status: 403 })
  })

  test('lets the app origin, the desktop app, and local programs through', async () => {
    const preflight = await fetch(`${companion.base}/agents`, {
      method: 'OPTIONS',
      headers: {
        origin: APP_ORIGIN,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
        'access-control-request-private-network': 'true'
      }
    })
    expect(preflight.headers.get('access-control-allow-origin')).toBe(APP_ORIGIN)
    expect(preflight.headers.get('access-control-allow-private-network')).toBe('true')
    for (const origin of [APP_ORIGIN, 'tauri://localhost', undefined]) {
      const opened = await openSocket(companion.ws, origin)
      expect('ws' in opened).toBe(true)
      if ('ws' in opened) opened.ws.close()
    }
  })
})

describe('agent sockets', () => {
  test('refuses an agent the companion does not know', async () => {
    expect(await openSocket(`${companion.ws}/agents/unknown/acp`, APP_ORIGIN)).toEqual({
      status: 404
    })
    const token = await companion.pair()
    const install = await fetch(`${companion.base}/agents/unknown/install`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(install.status).toBe(404)
  })

  test('closes a socket whose first message is not a valid session token', async () => {
    const { socket } = await openAgentSocket('/agents/fake/acp', 'guessed-token')
    expect(await socket.closed).toBe(4401)
  })

  test.skipIf(isWindows)('pipes the agent stdio as binary frames', async () => {
    const token = await companion.pair()
    const { ws, socket } = await openAgentSocket('/agents/fake/acp', token)
    await socket.until(() => socket.messages.some((message) => message.type === 'ready'))
    ws.send(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"initialize"}\n'))
    await socket.until(() => socket.output.includes('"method":"initialize"'))
    expect(socket.output.split('\n')[0]).toMatch(/^\{"pid":\d+\}$/)
    ws.close()
  })

  test.skipIf(isWindows)('stops the agent when its socket closes', async () => {
    const token = await companion.pair()
    const { ws, socket } = await openAgentSocket('/agents/fake/acp', token)
    await socket.until(() => /"pid":\d+/.test(socket.output))
    const pid = Number(/"pid":(\d+)/.exec(socket.output)?.[1])
    expect(isRunning(pid)).toBe(true)
    ws.close()
    const start = Date.now()
    while (isRunning(pid) && Date.now() - start < 5_000) await Bun.sleep(20)
    expect(isRunning(pid)).toBe(false)
  })

  test.skipIf(isWindows)('stops running agents when the companion shuts down', async () => {
    const token = await companion.pair()
    const { socket } = await openAgentSocket('/agents/fake/acp', token)
    await socket.until(() => /"pid":\d+/.test(socket.output))
    const pid = Number(/"pid":(\d+)/.exec(socket.output)?.[1])
    await companion.handle.close()
    expect(isRunning(pid)).toBe(false)
  })

  test.skipIf(isWindows)('runs a terminal sign-in and passes the pasted code', async () => {
    const token = await companion.pair()
    const { ws, socket } = await openAgentSocket('/agents/fake/sign-in', token)
    await socket.until(() => socket.messages.some((message) => message.type === 'url'))
    expect(socket.messages.find((message) => message.type === 'url')?.url).toBe(
      'https://example.com/oauth?client=fake'
    )
    ws.send(JSON.stringify({ type: 'code', code: 'good-code' }))
    await socket.until(() => socket.messages.some((message) => message.type === 'done'))
    expect(socket.messages.find((message) => message.type === 'done')?.ok).toBe(true)
  })

  test.skipIf(isWindows)('refuses a code with line breaks or other input', async () => {
    const token = await companion.pair()
    const { ws, socket } = await openAgentSocket('/agents/fake/sign-in', token)
    await socket.until(() => socket.messages.some((message) => message.type === 'ready'))
    ws.send(JSON.stringify({ type: 'code', code: 'good-code\nmore' }))
    expect(await socket.closed).toBe(1003)
  })

  test('installs only the adapter package the registry names', async () => {
    const token = await companion.pair()
    const install = (id: string) =>
      fetch(`${companion.base}/agents/${id}/install`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` }
      })
    expect((await install('fake')).status).toBe(200)
    expect((await install('plain')).status).toBe(400)
    expect(companion.installs).toEqual(['@example/fake-acp'])
  })
})

describe('the tab session a development server hands the MCP server', () => {
  const ENTRY = Bun.resolveSync('#mcp/index', import.meta.dir)
  const session = { token: 'd'.repeat(64), agentToken: 'e'.repeat(64) }
  const sessionEnv = {
    PAIRDRAW_MCP_AGENTS: '1',
    PAIRDRAW_MCP_AGENT_SESSION: session.token,
    PAIRDRAW_MCP_AGENT_TOKEN: session.agentToken
  }
  const servers: Array<() => void> = []

  afterEach(() => {
    for (const stop of servers.splice(0)) stop()
  })

  function freePort(): number {
    const probe = Bun.serve({ port: 0, fetch: () => new Response('') })
    const { port } = probe
    void probe.stop(true)
    if (port === undefined) throw new Error('No free port was assigned')
    return port
  }

  /**
   * Starts `pairdraw-mcp-http` as `bun run dev` does, and waits until it listens. Its runtime
   * folder, where the bridge keeps the agents' workspace, is the test's own, never the person's.
   */
  async function startHTTPServer(env: Record<string, string>) {
    const directory = mkdtempSync(join(tmpdir(), 'op-mcp-dev-agents-'))
    const port = freePort()
    const discoveryPath = join(directory, 'mcp.json')
    const child = Bun.spawn(['bun', ENTRY], {
      stdin: 'ignore',
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ...process.env,
        HOME: directory,
        XDG_RUNTIME_DIR: directory,
        LOCALAPPDATA: directory,
        PORT: String(port),
        PAIRDRAW_MCP_SOCKET: join(directory, 'mcp.sock'),
        PAIRDRAW_MCP_DISCOVERY_PATH: discoveryPath,
        PAIRDRAW_MCP_AUTH_TOKEN: MASTER_TOKEN,
        PAIRDRAW_MCP_CORS_ORIGIN: APP_ORIGIN,
        ...env
      }
    })
    servers.push(() => {
      child.kill()
      rmSync(directory, { recursive: true, force: true })
    })
    const reader = child.stderr.getReader()
    const decoder = new TextDecoder()
    let output = ''
    while (!output.includes('HTTP:')) {
      const { done, value } = await reader.read()
      if (done) throw new Error(`The server exited before it was ready: ${output}`)
      output += decoder.decode(value)
    }
    reader.releaseLock()
    return { base: `http://127.0.0.1:${port}`, directory, discoveryPath, output }
  }

  /** Whether the server offers eval, as its own token sees the tools in `/health`. */
  async function evalEnabled(base: string): Promise<boolean | undefined> {
    const response = await request(base, '/health', MASTER_TOKEN)
    const health = v.parse(
      v.object({ tools: v.array(v.object({ name: v.string(), enabled: v.boolean() })) }),
      await response.json()
    )
    return health.tools.find((tool) => tool.name === 'eval')?.enabled
  }

  function request(base: string, path: string, token: string) {
    return fetch(`${base}${path}`, {
      headers: { authorization: `Bearer ${token}`, origin: APP_ORIGIN }
    })
  }

  test('reaches the agent routes with that session alone', async () => {
    const server = await startHTTPServer(sessionEnv)
    const companion = await request(server.base, '/companion', session.token)
    expect(companion.status).toBe(200)
    // The agents' workspace is in the runtime folder the test set, not the person's.
    const info = v.parse(v.object({ workspace: v.string() }), await companion.json())
    expect(info.workspace.startsWith(server.directory)).toBe(true)
    // The discovery-file token, which is also the dev automation token, still starts nothing.
    expect((await request(server.base, '/agents', MASTER_TOKEN)).status).toBe(401)
    // Agents hold the agent token; it reaches `/mcp`, never the routes that start programs.
    expect((await request(server.base, '/agents', session.agentToken)).status).toBe(401)
    // The tab cannot sign itself out of a session it cannot pair again.
    await fetch(`${server.base}/pair/revoke`, {
      method: 'POST',
      headers: { authorization: `Bearer ${session.token}`, origin: APP_ORIGIN }
    })
    expect((await request(server.base, '/companion', session.token)).status).toBe(200)
    const discovery = readFileSync(server.discoveryPath, 'utf8')
    expect(discovery).not.toContain(session.token)
    expect(discovery).not.toContain(session.agentToken)
  })

  test('keeps eval off while the bridge is on, as the companion does', async () => {
    const bridged = await startHTTPServer({ ...sessionEnv, PAIRDRAW_MCP_EVAL: '1' })
    expect(bridged.output).toContain('PAIRDRAW_MCP_EVAL=1 is ignored')
    expect(await evalEnabled(bridged.base)).toBe(false)
    const plain = await startHTTPServer({ PAIRDRAW_MCP_AGENTS: '', PAIRDRAW_MCP_EVAL: '1' })
    expect(await evalEnabled(plain.base)).toBe(true)
  })

  test('still refuses other sites', async () => {
    const server = await startHTTPServer(sessionEnv)
    const response = await fetch(`${server.base}/companion`, {
      headers: { authorization: `Bearer ${session.token}`, origin: 'https://evil.example' }
    })
    expect(response.status).toBe(403)
  })

  test('starts no bridge without the switch, or with a malformed session', async () => {
    const unset = await startHTTPServer({
      PAIRDRAW_MCP_AGENTS: '',
      PAIRDRAW_MCP_AGENT_SESSION: session.token,
      PAIRDRAW_MCP_AGENT_TOKEN: session.agentToken
    })
    // Without the bridge its routes do not exist.
    expect((await request(unset.base, '/companion', session.token)).status).toBe(404)
    const malformed = await startHTTPServer({
      ...sessionEnv,
      PAIRDRAW_MCP_AGENT_TOKEN: session.token
    })
    expect((await request(malformed.base, '/companion', session.token)).status).toBe(404)
  })

  test.each([
    ['no switch', { ...sessionEnv, PAIRDRAW_MCP_AGENTS: '0' }],
    ['a short token', { ...sessionEnv, PAIRDRAW_MCP_AGENT_SESSION: 'd'.repeat(32) }],
    ['uppercase hex', { ...sessionEnv, PAIRDRAW_MCP_AGENT_TOKEN: 'E'.repeat(64) }],
    ['the same token twice', { ...sessionEnv, PAIRDRAW_MCP_AGENT_TOKEN: session.token }],
    ['a missing agent token', { ...sessionEnv, PAIRDRAW_MCP_AGENT_TOKEN: undefined }]
  ])('reads no session from %s', (_label, env) => {
    expect(devAgentBridgeFromEnv(env)).toBeNull()
  })

  test('reads the session the development server set', () => {
    expect(devAgentBridgeFromEnv(sessionEnv)).toEqual({ trustedSessions: [session] })
  })
})
