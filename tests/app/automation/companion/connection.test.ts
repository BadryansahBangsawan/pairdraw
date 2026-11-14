import { describe, expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'

import { AUTOMATION_HTTP_PORT } from '@pairdraw/core/constants'

import {
  companionFingerprint,
  connectCompanionFromLocation,
  createCompanionConnection,
  parseCompanionLink
} from '@/app/automation/companion/connection'

const CODE = '0123456789abcdef0123456789abcdef'
const TOKEN = 'f'.repeat(64)
const AGENT_TOKEN = 'a'.repeat(64)

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('parseCompanionLink', () => {
  test('reads the code and an optional port from the fragment', () => {
    expect(parseCompanionLink(`#connect=${CODE}`)).toEqual({
      code: CODE,
      port: AUTOMATION_HTTP_PORT
    })
    expect(parseCompanionLink(`#connect=${CODE}&port=7601`)).toEqual({ code: CODE, port: 7601 })
  })

  test.each([
    ['no code', '#port=7601'],
    ['a malformed code', '#connect=not-a-code'],
    ['a privileged port', `#connect=${CODE}&port=80`],
    ['a port out of range', `#connect=${CODE}&port=70000`],
    ['a host in place of a port', `#connect=${CODE}&port=evil.example`]
  ])('rejects %s', (_label, hash) => {
    expect(parseCompanionLink(hash)).toBeNull()
  })
})

describe('companion connection', () => {
  test('pairs with the code on this machine and keeps the token', async () => {
    const request = mock(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ token: TOKEN, agentToken: AGENT_TOKEN, version: '0.16.0' })
    )
    const connection = createCompanionConnection({ fetch: request })
    expect(await connection.pair({ code: CODE, port: 7601 })).toBe(true)
    expect(String(request.mock.calls[0]?.[0])).toBe('http://127.0.0.1:7601/pair')
    expect(connection.connected()).toBe(true)
    expect(connection.token()).toBe(TOKEN)
    expect(connection.agentToken()).toBe(AGENT_TOKEN)
    expect(connection.url()).toBe('http://127.0.0.1:7601')
    expect(connection.state.version).toBe('0.16.0')
    connection.disconnect()
    expect(connection.token()).toBeNull()
    expect(connection.agentToken()).toBeNull()
    // Disconnecting signs the tab out in the companion too.
    const [url, init] = request.mock.calls.at(-1) ?? []
    expect(String(url)).toBe('http://127.0.0.1:7601/pair/revoke')
    expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`)
  })

  test('keeps an existing pairing when a new link fails', async () => {
    let refuse = false
    const connection = createCompanionConnection({
      fetch: async () =>
        refuse
          ? jsonResponse({ error: 'no' }, 401)
          : jsonResponse({ token: TOKEN, agentToken: AGENT_TOKEN, version: '0.16.0' })
    })
    await connection.pair({ code: CODE, port: 7600 })
    refuse = true
    expect(await connection.pair({ code: CODE, port: 7601 })).toBe(false)
    expect(connection.state).toMatchObject({ status: 'connected', failure: 'rejected' })
    expect(connection.token()).toBe(TOKEN)
    expect(connection.url()).toBe('http://127.0.0.1:7600')
  })

  test('pairs with a link only once the person confirms it', async () => {
    const request = mock(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ token: TOKEN, agentToken: AGENT_TOKEN, version: '0.16.0' })
    )
    const connection = createCompanionConnection({ fetch: request })
    await connection.offer({ code: CODE, port: 7601 })
    expect(connection.state.pending).toEqual({
      port: 7601,
      fingerprint: await companionFingerprint(CODE)
    })
    expect(request).not.toHaveBeenCalled()
    connection.dismiss()
    expect(connection.state.pending).toBeNull()
    expect(await connection.confirm()).toBe(false)
    expect(request).not.toHaveBeenCalled()

    await connection.offer({ code: CODE, port: 7601 })
    expect(await connection.confirm()).toBe(true)
    expect(connection.state.pending).toBeNull()
    expect(String(request.mock.calls[0]?.[0])).toBe('http://127.0.0.1:7601/pair')
  })

  test('derives the fingerprint the companion prints', async () => {
    const hex = createHash('sha256').update(CODE).digest('hex').slice(0, 6).toUpperCase()
    expect(await companionFingerprint(CODE)).toBe(`${hex.slice(0, 3)}-${hex.slice(3)}`)
  })

  test.each([
    [401, 'rejected'],
    [429, 'rate-limited']
  ] as const)('reports a refused code (%i) as %s', async (status, failure) => {
    const connection = createCompanionConnection({
      fetch: async () => jsonResponse({ error: 'no' }, status)
    })
    expect(await connection.pair({ code: CODE, port: 7600 })).toBe(false)
    expect(connection.state).toMatchObject({ status: 'idle', failure })
    expect(connection.token()).toBeNull()
  })

  test('reports a companion that is not running', async () => {
    const connection = createCompanionConnection({
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      }
    })
    expect(await connection.pair({ code: CODE, port: 7600 })).toBe(false)
    expect(connection.state.failure).toBe('unreachable')
  })

  test('forgets a token the restarted companion no longer accepts', async () => {
    let restarted = false
    const connection = createCompanionConnection({
      fetch: async () =>
        restarted
          ? jsonResponse({}, 401)
          : jsonResponse({ token: TOKEN, agentToken: AGENT_TOKEN, version: '0.16.0' })
    })
    await connection.pair({ code: CODE, port: 7600 })
    restarted = true
    await connection.check()
    expect(connection.state).toMatchObject({ status: 'idle', failure: 'expired' })
    expect(connection.token()).toBeNull()
  })

  test('keeps the token while the companion is briefly unreachable', async () => {
    let down = false
    const connection = createCompanionConnection({
      fetch: async (url) => {
        if (down) throw new TypeError('Failed to fetch')
        return String(url).endsWith('/pair')
          ? jsonResponse({ token: TOKEN, agentToken: AGENT_TOKEN, version: '0.16.0' })
          : jsonResponse({ version: '0.16.0', workspace: '/tmp/agents' })
      }
    })
    await connection.pair({ code: CODE, port: 7600 })
    down = true
    await connection.check()
    expect(connection.state.status).toBe('lost')
    expect(connection.token()).toBeNull()
    down = false
    await connection.check()
    expect(connection.token()).toBe(TOKEN)
  })
})

describe('the development server session', () => {
  function companionAnswer(url: string): Response {
    return String(url).endsWith('/companion')
      ? jsonResponse({ version: '0.16.0', workspace: '/tmp/agents' })
      : jsonResponse({ error: 'unexpected' }, 404)
  }

  test('connects without a link, a confirmation, or a pairing request', async () => {
    const request = mock(async (url: string, _init?: RequestInit) => companionAnswer(url))
    const connection = createCompanionConnection({ fetch: request })
    await connection.adopt({ token: TOKEN, agentToken: AGENT_TOKEN, port: 7600 })

    expect(connection.state).toMatchObject({ status: 'connected', dev: true, pending: null })
    expect(connection.token()).toBe(TOKEN)
    expect(connection.agentToken()).toBe(AGENT_TOKEN)
    const urls = request.mock.calls.map(([url]) => String(url))
    expect(urls).toEqual(['http://127.0.0.1:7600/companion'])
    const [, init] = request.mock.calls[0] ?? []
    expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`)
    connection.disconnect()
  })

  test('keeps checking a session that another server on its port refuses', async () => {
    // A companion or another MCP server holds the port, and the development one could not start.
    let refused = true
    const connection = createCompanionConnection({
      fetch: async (url) =>
        refused ? jsonResponse({ error: 'Unauthorized' }, 401) : companionAnswer(url)
    })
    await connection.adopt({ token: TOKEN, agentToken: AGENT_TOKEN, port: 7600 })
    expect(connection.state).toMatchObject({ status: 'lost', failure: 'unreachable', dev: true })
    expect(connection.token()).toBeNull()

    refused = false
    await connection.check()
    expect(connection.state).toMatchObject({ status: 'connected', failure: null, dev: true })
    expect(connection.token()).toBe(TOKEN)
    connection.disconnect()
  })

  test('still forgets a paired session its companion no longer accepts', async () => {
    let refused = false
    const connection = createCompanionConnection({
      fetch: async () =>
        refused
          ? jsonResponse({ error: 'Unauthorized' }, 401)
          : jsonResponse({ token: TOKEN, agentToken: AGENT_TOKEN, version: '0.16.0' })
    })
    await connection.pair({ code: CODE, port: 7601 })
    refused = true
    await connection.check()

    expect(connection.state).toMatchObject({ status: 'idle', failure: 'expired', dev: false })
    expect(connection.token()).toBeNull()
  })

  test('waits for a server that has not started yet', async () => {
    let down = true
    const connection = createCompanionConnection({
      fetch: async (url) => {
        if (down) throw new TypeError('Failed to fetch')
        return companionAnswer(url)
      }
    })
    await connection.adopt({ token: TOKEN, agentToken: AGENT_TOKEN, port: 7600 })
    expect(connection.state).toMatchObject({ status: 'lost', dev: true })
    down = false
    await connection.check()
    expect(connection.token()).toBe(TOKEN)
    connection.disconnect()
  })

  test('disconnecting forgets it here without signing the server out', async () => {
    const request = mock(async (url: string, _init?: RequestInit) => companionAnswer(url))
    const connection = createCompanionConnection({ fetch: request })
    await connection.adopt({ token: TOKEN, agentToken: AGENT_TOKEN, port: 7600 })
    connection.disconnect()

    expect(connection.state).toMatchObject({ status: 'idle', dev: false })
    expect(connection.token()).toBeNull()
    expect(request.mock.calls.map(([url]) => String(url))).not.toContain(
      'http://127.0.0.1:7600/pair/revoke'
    )
  })

  test('a confirmed link replaces it', async () => {
    const request = mock(async (url: string, _init?: RequestInit) =>
      String(url).endsWith('/pair')
        ? jsonResponse({ token: 'b'.repeat(64), agentToken: 'c'.repeat(64), version: '0.16.0' })
        : companionAnswer(url)
    )
    const connection = createCompanionConnection({ fetch: request })
    await connection.adopt({ token: TOKEN, agentToken: AGENT_TOKEN, port: 7600 })
    expect(await connection.pair({ code: CODE, port: 7601 })).toBe(true)

    expect(connection.state).toMatchObject({ status: 'connected', dev: false })
    expect(connection.url()).toBe('http://127.0.0.1:7601')
    expect(request.mock.calls.map(([url]) => String(url))).not.toContain(
      'http://127.0.0.1:7600/pair/revoke'
    )
    connection.disconnect()
  })
})

describe('connectCompanionFromLocation', () => {
  test('removes the code from the address and holds the link for confirmation', async () => {
    const replaceState = mock(
      (_state: unknown, _unused: string, _url?: string | URL | null) => undefined
    )
    const offer = mock(async () => undefined)
    const offered = await connectCompanionFromLocation(
      { hash: `#connect=${CODE}`, href: `https://app.example.com/?test#connect=${CODE}` },
      { replaceState, state: null },
      { offer }
    )
    expect(offered).toBe(true)
    expect(replaceState.mock.calls[0]?.[2]).toBe('https://app.example.com/?test')
    expect(offer).toHaveBeenCalledWith({ code: CODE, port: AUTOMATION_HTTP_PORT })
  })

  test('leaves other fragments alone', async () => {
    const replaceState = mock(() => undefined)
    const offer = mock(async () => undefined)
    await connectCompanionFromLocation(
      { hash: '#section', href: 'https://app.example.com/#section' },
      { replaceState, state: null },
      { offer }
    )
    expect(replaceState).not.toHaveBeenCalled()
    expect(offer).not.toHaveBeenCalled()
  })
})
