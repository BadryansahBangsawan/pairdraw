import { IS_TAURI } from '@pairdraw/core/constants'

import type { SignInCallback } from '@/app/ai/providers/sign-in/attempt'
import {
  deepLinkRedirect,
  popupRedirect,
  type RedirectReader
} from '@/app/ai/providers/sign-in/redirect'

import { MCP_OAUTH_CALLBACK_CHANNEL } from './provider'

const DEEP_LINK_PROVIDER = 'mcp'
const POPUP_NAME = 'pairdraw-mcp'
/** Authorization codes live minutes; an attempt left open longer has to start again. */
const CALLBACK_LIFETIME_MS = 10 * 60_000

/** What came back to the redirect: a code for this attempt, or why there is none. */
export type MCPCallbackOutcome =
  | { kind: 'code'; code: string; iss?: string }
  | { kind: 'denied' | 'mismatch' | 'expired' }

/** Where the redirect returns: a popup in the web app, a deep link on the desktop. */
export type MCPOAuthCallback = SignInCallback<MCPCallbackOutcome>

/** Reads a redirect query, rejecting one that belongs to another attempt. */
export function mcpCallbackOutcome(query: string, expectedState: string): MCPCallbackOutcome {
  const params = new URLSearchParams(query)
  if (params.get('state') !== expectedState) return { kind: 'mismatch' }
  const code = params.get('code')
  if (!code) return { kind: 'denied' }
  const iss = params.get('iss')
  return iss ? { kind: 'code', code, iss } : { kind: 'code', code }
}

/** How an attempt reads the server's redirect. */
function redirectReader(state: string): RedirectReader<MCPCallbackOutcome> {
  return {
    read: (query) => mcpCallbackOutcome(query, state),
    expired: { kind: 'expired' },
    lifetimeMs: CALLBACK_LIFETIME_MS
  }
}

/**
 * Readies the redirect for one attempt before the authorization page opens. Called within the
 * click that starts sign-in, so the web app's popup is not blocked; null when it was.
 */
export function prepareMCPOAuthCallback(state: string): Promise<MCPOAuthCallback | null> {
  if (IS_TAURI) return deepLinkRedirect(DEEP_LINK_PROVIDER, redirectReader(state))
  return Promise.resolve(
    popupRedirect(POPUP_NAME, MCP_OAUTH_CALLBACK_CHANNEL, redirectReader(state))
  )
}
