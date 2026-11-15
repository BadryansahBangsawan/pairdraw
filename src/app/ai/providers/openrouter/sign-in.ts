import { IS_TAURI } from '@pairdraw/core/constants'

import {
  callbackOutcome,
  startSignIn,
  type CallbackOutcome,
  type SignIn,
  type SignInCallback,
  type SignInFailure
} from '../sign-in/attempt'
import { loopbackRedirect } from '../sign-in/loopback'
import { popupRedirect, type RedirectReader } from '../sign-in/redirect'
import {
  exchangeOpenRouterCode,
  openRouterAuthorizationURL,
  OPENROUTER_CODE_LIFETIME_MS
} from './oauth'

/** Served from `public/`; it relays the redirect to the editor over this channel. */
const OPENROUTER_CALLBACK_PATH = '/oauth/openrouter.html'
const OPENROUTER_CALLBACK_CHANNEL = 'pairdraw:openrouter-oauth'
/** Where the desktop shell's loopback port reads the redirect (`desktop/src/network/oauth.rs`). */
const OPENROUTER_LOOPBACK_PATH = '/oauth/openrouter'
const POPUP_NAME = 'pairdraw-openrouter'

export type OpenRouterSignInFailure = SignInFailure | 'blocked'
export type OpenRouterSignIn = SignIn<string, 'blocked'>

export interface OpenRouterSignInOptions {
  signal: AbortSignal
  /** Prefills the name of the key OpenRouter creates. */
  keyLabel: string
}

/** How an attempt reads OpenRouter's redirect, which carries a code that lives minutes. */
function redirectReader(state: string): RedirectReader<CallbackOutcome> {
  return {
    read: (query) => callbackOutcome(query, state),
    expired: { kind: 'expired' },
    lifetimeMs: OPENROUTER_CODE_LIFETIME_MS
  }
}

/** A popup that returns to this origin; it opens before anything is awaited, or is blocked. */
function popupCallback(state: string): Promise<SignInCallback | { failure: 'blocked' }> {
  const callback = popupRedirect(POPUP_NAME, OPENROUTER_CALLBACK_CHANNEL, redirectReader(state))
  return Promise.resolve(callback ?? { failure: 'blocked' })
}

/** Signs in to OpenRouter with OAuth PKCE and returns a new API key for this app. */
export function signInWithOpenRouter({
  signal,
  keyLabel
}: OpenRouterSignInOptions): OpenRouterSignIn {
  // The desktop app's system browser returns to a loopback port, which OpenRouter accepts on any
  // port; the port is known once the desktop shell takes it, before the page opens.
  let callbackURL = new URL(OPENROUTER_CALLBACK_PATH, window.location.origin).href
  async function loopbackCallback(state: string): Promise<SignInCallback> {
    const loopback = await loopbackRedirect('openrouter', 'OpenRouter', state)
    // The system picks the port, so it is never one another program holds.
    if (loopback === 'port-in-use') throw new Error('The OpenRouter sign-in port is in use')
    callbackURL = `http://localhost:${loopback.port}${OPENROUTER_LOOPBACK_PATH}`
    return loopback.callback
  }
  return startSignIn({
    signal,
    callback: IS_TAURI ? loopbackCallback : popupCallback,
    authorizationURL: (pkce) => openRouterAuthorizationURL(callbackURL, pkce, keyLabel),
    exchange: (code, verifier) => exchangeOpenRouterCode(code, verifier)
  })
}
