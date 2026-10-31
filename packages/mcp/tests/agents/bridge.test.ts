import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import * as v from 'valibot'

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
    expect(lookup.executables['openpencil-mcp-http']).toBeTruthy()
    expect(lookup.versions['@open-pencil/mcp']).toBeTruthy()
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
