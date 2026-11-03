import { auth, type FetchLike } from '@modelcontextprotocol/client'
import { fromUint8Array } from 'js-base64'

import {
  abortable,
  runSignInAttempt,
  type PreparedSignIn
} from '@/app/ai/providers/sign-in/attempt'

import { mcpFetch } from '../http'
import type { MCPConnectionID } from '../types'
import { prepareMCPOAuthCallback, type MCPCallbackOutcome, type MCPOAuthCallback } from './callback'
import { createMCPOAuthProvider, mcpOAuthRedirectURL } from './provider'
import { credentialMCPOAuthStore, type MCPOAuthStore } from './state'

export type MCPSignInFailure = 'cancelled' | 'expired' | 'failed' | 'blocked'
export type MCPSignInResult = { ok: true } | { ok: false; reason: MCPSignInFailure }

export interface MCPSignIn {
  /** Opens the authorization page again for the same attempt. */
  reopen: () => void
  result: Promise<MCPSignInResult>
}

export interface MCPSignInTarget {
  id: MCPConnectionID
  url: string
}

export interface MCPSignInDependencies {
  /** Readies the redirect; null when the web app's popup was blocked. */
  callback: (state: string) => Promise<MCPOAuthCallback | null>
  redirectURL: () => string
  fetch?: FetchLike
  store?: MCPOAuthStore
}

const defaultDependencies: MCPSignInDependencies = {
  callback: prepareMCPOAuthCallback,
  redirectURL: mcpOAuthRedirectURL
}

const OUTCOME_FAILURES = {
  denied: 'cancelled',
  mismatch: 'failed',
  expired: 'expired'
} as const satisfies Record<Exclude<MCPCallbackOutcome['kind'], 'code'>, MCPSignInFailure>

function randomState(): string {
  return fromUint8Array(crypto.getRandomValues(new Uint8Array(16)), true)
}

/**
 * Signs in to an MCP server with OAuth: discovers its authorization server, registers this app
 * as a client, opens the authorization page, waits for the redirect, and trades the code for
 * tokens, which go to the credential store. A saved sign-in that can be refreshed needs no page.
 */
export function signInToMCPConnection(
  target: MCPSignInTarget,
  signal: AbortSignal,
  dependencies: MCPSignInDependencies = defaultDependencies
): MCPSignIn {
  const state = randomState()
  // Prepared before anything is awaited, so the web app's popup opens within the click.
  const prepared = dependencies
    .callback(state)
    .then((callback): PreparedSignIn<MCPOAuthCallback, MCPSignInResult> =>
      callback ? { callback } : { result: { ok: false, reason: 'blocked' } }
    )

  return runSignInAttempt(
    signal,
    prepared,
    async (callback, open): Promise<MCPSignInResult> => {
      const redirect: { page: URL | null } = { page: null }
      const provider = createMCPOAuthProvider(target.id, {
        redirectURL: dependencies.redirectURL(),
        state,
        store: dependencies.store ?? credentialMCPOAuthStore,
        onRedirect: (url) => {
          redirect.page = url
        }
      })
      const fetchFn = dependencies.fetch ?? mcpFetch()
      const options = { serverUrl: target.url, ...(fetchFn ? { fetchFn } : {}) }
      const started = await abortable(auth(provider, options), signal)
      if (started === 'AUTHORIZED') return { ok: true }
      if (!redirect.page) return { ok: false, reason: 'failed' }
      await open(redirect.page.href)
      const outcome = await abortable(callback.wait(), signal)
      if (outcome.kind !== 'code') return { ok: false, reason: OUTCOME_FAILURES[outcome.kind] }
      const finished = await abortable(
        auth(provider, {
          ...options,
          authorizationCode: outcome.code,
          ...(outcome.iss ? { iss: outcome.iss } : {})
        }),
        signal
      )
      return finished === 'AUTHORIZED' ? { ok: true } : { ok: false, reason: 'failed' }
    },
    (reason) => ({ ok: false, reason })
  )
}

/** Forgets a connection's sign-in: its tokens and client registration. */
export function signOutOfMCPConnection(
  id: MCPConnectionID,
  store: MCPOAuthStore = credentialMCPOAuthStore
): Promise<void> {
  return store.clear(id)
}

/** Whether the connection has tokens saved from a sign-in. */
export async function mcpConnectionSignedIn(
  id: MCPConnectionID,
  store: MCPOAuthStore = credentialMCPOAuthStore
): Promise<boolean> {
  return (await store.read(id)).tokens !== undefined
}
