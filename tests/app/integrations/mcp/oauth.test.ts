import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { fromUint8Array } from 'js-base64'

import { mcpOAuthAccessToken, type MCPHTTPConnection } from '@/app/integrations/mcp/auth'
import { connectMCPClient, defaultMCPConnectDependencies } from '@/app/integrations/mcp/client'
import { mcpCallbackOutcome, type MCPOAuthCallback } from '@/app/integrations/mcp/oauth/callback'
import { createMCPOAuthProvider } from '@/app/integrations/mcp/oauth/provider'
import { signInToMCPConnection } from '@/app/integrations/mcp/oauth/sign-in'
import {
  mcpOAuthTokensFresh,
  parseMCPOAuthState,
  type MCPOAuthState,
  type MCPOAuthStore
} from '@/app/integrations/mcp/oauth/state'
import type { MCPConnectionID } from '@/app/integrations/mcp/types'

import { createTestMCPServer } from '#tests/helpers/mcp/external-server'

const REDIRECT = 'https://app.example.com/oauth/mcp.html'
const ID: MCPConnectionID = 'mcp-notion'

function memoryStore(): MCPOAuthStore & { states: Map<MCPConnectionID, MCPOAuthState> } {
  const states = new Map<MCPConnectionID, MCPOAuthState>()
  return {
    states,
    read: async (id) => structuredClone(states.get(id) ?? {}),
    write: async (id, state) => {
      states.set(id, structuredClone(state))
    },
    clear: async (id) => {
      states.delete(id)
    }
  }
}

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return fromUint8Array(new Uint8Array(digest), true)
}

/** A resource server and its authorization server, which issue tokens as OAuth 2.1 does. */
function startServers() {
  const mcp = createTestMCPServer([
    { name: 'search', call: () => ({ content: [{ type: 'text', text: 'ok' }] }) }
  ])
  const seen = { authorizations: [] as string[], registrations: 0, refreshes: 0 }
  let challenge = ''
  let accessToken = 'access-1'
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      const url = new URL(request.url)
      const origin = url.origin
      if (url.pathname === '/mcp') {
        const authorization = request.headers.get('authorization') ?? ''
        seen.authorizations.push(authorization)
        if (authorization !== `Bearer ${accessToken}`) {
          return new Response(null, {
            status: 401,
            headers: {
              'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`
            }
          })
        }
        return mcp.handleHTTP(request)
      }
      if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
        return Response.json({ resource: `${origin}/mcp`, authorization_servers: [origin] })
      }
      if (url.pathname.startsWith('/.well-known/oauth-authorization-server')) {
        return Response.json({
          issuer: origin,
          authorization_endpoint: `${origin}/authorize`,
          token_endpoint: `${origin}/token`,
          registration_endpoint: `${origin}/register`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none']
        })
      }
      if (url.pathname === '/register') {
        seen.registrations++
        const body: unknown = await request.json()
        return Response.json(
          { ...(typeof body === 'object' ? body : {}), client_id: 'client-1' },
          { status: 201 }
        )
      }
      if (url.pathname === '/token') {
        const form = new URLSearchParams(await request.text())
        if (form.get('grant_type') === 'authorization_code') {
          const verifier = form.get('code_verifier') ?? ''
          if (form.get('code') !== 'code-1' || (await s256(verifier)) !== challenge) {
            return Response.json({ error: 'invalid_grant' }, { status: 400 })
          }
          return Response.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'refresh-1'
          })
        }
        if (
          form.get('grant_type') === 'refresh_token' &&
          form.get('refresh_token') === 'refresh-1'
        ) {
          seen.refreshes++
          accessToken = 'access-2'
          return Response.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'refresh-1'
          })
        }
        return Response.json({ error: 'invalid_grant' }, { status: 400 })
      }
      return new Response(null, { status: 404 })
    }
  })
  return {
    server,
    seen,
    url: `http://127.0.0.1:${server.port}/mcp`,
    rememberChallenge: (value: string) => {
      challenge = value
    }
  }
}

let servers: ReturnType<typeof startServers>
beforeAll(() => {
  servers = startServers()
})
afterAll(() => {
  void servers.server.stop(true)
})

let store: ReturnType<typeof memoryStore>
beforeEach(() => {
  store = memoryStore()
})

/** Stands in for the browser: reads the authorization page's query and redirects with a code. */
function browser(approve: boolean) {
  const opened: URL[] = []
  const callback = async (state: string): Promise<MCPOAuthCallback> => {
    let outcome: ReturnType<typeof mcpCallbackOutcome> = { kind: 'expired' }
    return {
      open: (href) => {
        const page = new URL(href)
        opened.push(page)
        servers.rememberChallenge(page.searchParams.get('code_challenge') ?? '')
        const query = approve
          ? `?code=code-1&state=${page.searchParams.get('state') ?? ''}`
          : `?error=access_denied&state=${page.searchParams.get('state') ?? ''}`
        outcome = mcpCallbackOutcome(query, state)
      },
      wait: async () => outcome,
      close: () => undefined
    }
  }
  return { opened, callback }
}

const connection = (): MCPHTTPConnection => ({
  id: ID,
  name: 'Notion',
  enabled: true,
  transport: { type: 'streamable-http', url: servers.url },
  authentication: {
    type: 'oauth',
    credentialRef: { integrationId: 'mcp', profileId: ID, field: 'oauth' }
  }
})

describe('MCP OAuth sign-in', () => {
  test('registers, authorizes with PKCE, and saves tokens the connection then uses', async () => {
    const { opened, callback } = browser(true)
    const signIn = signInToMCPConnection(
      { id: ID, url: servers.url },
      new AbortController().signal,
      { callback, redirectURL: () => REDIRECT, store }
    )
    expect(await signIn.result).toEqual({ ok: true })
    const page = opened[0]
    expect(page?.searchParams.get('client_id')).toBe('client-1')
    expect(page?.searchParams.get('redirect_uri')).toBe(REDIRECT)
    expect(page?.searchParams.get('code_challenge_method')).toBe('S256')
    expect(store.states.get(ID)?.tokens?.access_token).toBe('access-1')

    const session = await connectMCPClient(connection(), {
      ...defaultMCPConnectDependencies,
      desktop: () => false,
      oauth: (target) => createMCPOAuthProvider(target.id, { redirectURL: REDIRECT, store })
    })
    try {
      const { tools } = await session.client.listTools()
      expect(tools.map((tool) => tool.name)).toEqual(['search'])
      expect(servers.seen.authorizations.at(-1)).toBe('Bearer access-1')
    } finally {
      await session.close()
    }
  })

  test('reports a refused authorization as cancelled and saves nothing', async () => {
    const { callback } = browser(false)
    const signIn = signInToMCPConnection(
      { id: ID, url: servers.url },
      new AbortController().signal,
      { callback, redirectURL: () => REDIRECT, store }
    )
    expect(await signIn.result).toEqual({ ok: false, reason: 'cancelled' })
    expect(store.states.get(ID)?.tokens).toBeUndefined()
  })

  test('reports a blocked popup', async () => {
    const signIn = signInToMCPConnection(
      { id: ID, url: servers.url },
      new AbortController().signal,
      { callback: async () => null, redirectURL: () => REDIRECT, store }
    )
    expect(await signIn.result).toEqual({ ok: false, reason: 'blocked' })
  })

  test('refreshes an expired token before an agent session uses it', async () => {
    const { callback } = browser(true)
    await signInToMCPConnection({ id: ID, url: servers.url }, new AbortController().signal, {
      callback,
      redirectURL: () => REDIRECT,
      store
    }).result
    const saved = store.states.get(ID)
    if (!saved) throw new Error('Not signed in')
    store.states.set(ID, { ...saved, obtainedAt: Date.now() - 2 * 3600_000 })
    const token = await mcpOAuthAccessToken(connection(), { store, redirectURL: REDIRECT })
    expect(token).toBe('access-2')
    expect(servers.seen.refreshes).toBe(1)
  })

  test('rejects a redirect that belongs to another attempt', () => {
    expect(mcpCallbackOutcome('?code=abc&state=other', 'mine')).toEqual({ kind: 'mismatch' })
    expect(mcpCallbackOutcome('?code=abc&state=mine&iss=https://as', 'mine')).toEqual({
      kind: 'code',
      code: 'abc',
      iss: 'https://as'
    })
  })

  test('reads saved sign-ins defensively and knows when tokens expire', () => {
    expect(parseMCPOAuthState('not json')).toEqual({})
    expect(parseMCPOAuthState('{"tokens":{"token_type":"Bearer"}}')).toEqual({})
    const tokens = { access_token: 'a', token_type: 'Bearer', expires_in: 60 }
    expect(mcpOAuthTokensFresh({ tokens, obtainedAt: 0 }, 30_000)).toBeFalse()
    expect(mcpOAuthTokensFresh({ tokens, obtainedAt: 0 }, 0)).toBeFalse()
    expect(mcpOAuthTokensFresh({ tokens: { ...tokens, expires_in: 3600 }, obtainedAt: 0 }, 0)).toBe(
      true
    )
    expect(mcpOAuthTokensFresh({ tokens: { access_token: 'a', token_type: 'Bearer' } })).toBeTrue()
  })
})
