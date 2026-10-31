import { describe, expect, mock, test } from 'bun:test'

import { AUTOMATION_HTTP_PORT } from '@open-pencil/core/constants'

import {
  connectCompanionFromLocation,
  createCompanionConnection,
  parseCompanionLink
} from '@/app/automation/companion/connection'

const CODE = '0123456789abcdef0123456789abcdef'
const TOKEN = 'f'.repeat(64)

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
      jsonResponse({ token: TOKEN, version: '0.16.0' })
    )
    const connection = createCompanionConnection({ fetch: request })
    expect(await connection.pair({ code: CODE, port: 7601 })).toBe(true)
    expect(String(request.mock.calls[0]?.[0])).toBe('http://127.0.0.1:7601/pair')
    expect(connection.connected()).toBe(true)
    expect(connection.token()).toBe(TOKEN)
    expect(connection.url()).toBe('http://127.0.0.1:7601')
    expect(connection.state.version).toBe('0.16.0')
    connection.disconnect()
    expect(connection.token()).toBeNull()
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
        restarted ? jsonResponse({}, 401) : jsonResponse({ token: TOKEN, version: '0.16.0' })
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
          ? jsonResponse({ token: TOKEN, version: '0.16.0' })
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

describe('connectCompanionFromLocation', () => {
  test('removes the code from the address before pairing', async () => {
    const replaceState = mock(
      (_state: unknown, _unused: string, _url?: string | URL | null) => undefined
    )
    const pair = mock(async () => true)
    const paired = await connectCompanionFromLocation(
      { hash: `#connect=${CODE}`, href: `https://app.openpencil.dev/?test#connect=${CODE}` },
      { replaceState, state: null },
      { pair }
    )
    expect(paired).toBe(true)
    expect(replaceState.mock.calls[0]?.[2]).toBe('https://app.openpencil.dev/?test')
    expect(pair).toHaveBeenCalledWith({ code: CODE, port: AUTOMATION_HTTP_PORT })
  })

  test('leaves other fragments alone', async () => {
    const replaceState = mock(() => undefined)
    const pair = mock(async () => true)
    await connectCompanionFromLocation(
      { hash: '#section', href: 'https://app.openpencil.dev/#section' },
      { replaceState, state: null },
      { pair }
    )
    expect(replaceState).not.toHaveBeenCalled()
    expect(pair).not.toHaveBeenCalled()
  })
})
