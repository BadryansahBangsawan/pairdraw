import { IS_TAURI } from '@open-pencil/core/constants'

import { WEB_APP_ORIGIN } from '@/constants'

import {
  callbackOutcome,
  startSignIn,
  type CallbackOutcome,
  type SignIn,
  type SignInCallback,
  type SignInFailure
} from '../sign-in/attempt'
import { deepLinkRedirect, popupRedirect, type RedirectReader } from '../sign-in/redirect'
import {
  exchangeOpenRouterCode,
  openRouterAuthorizationURL,
  OPENROUTER_CODE_LIFETIME_MS
} from './oauth'

/** Served from `public/`; it relays the redirect to the editor over this channel. */
export const OPENROUTER_CALLBACK_PATH = '/oauth/openrouter.html'
export const OPENROUTER_CALLBACK_CHANNEL = 'open-pencil:openrouter-oauth'
/** Served from `public/` on the web app; it hands the redirect to the desktop app's deep link. */
export const OPENROUTER_DESKTOP_CALLBACK_PATH = '/oauth/openrouter-desktop.html'
const POPUP_NAME = 'open-pencil-openrouter'

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

/** The system browser, which returns through an `openpencil://oauth/openrouter` link. */
function deepLinkCallback(state: string): Promise<SignInCallback> {
  return deepLinkRedirect('openrouter', redirectReader(state))
}

/** Signs in to OpenRouter with OAuth PKCE and returns a new API key for this app. */
export function signInWithOpenRouter({
  signal,
  keyLabel
}: OpenRouterSignInOptions): OpenRouterSignIn {
  const callbackURL = IS_TAURI
    ? new URL(OPENROUTER_DESKTOP_CALLBACK_PATH, WEB_APP_ORIGIN).href
    : new URL(OPENROUTER_CALLBACK_PATH, window.location.origin).href
  return startSignIn({
    signal,
    callback: IS_TAURI ? deepLinkCallback : popupCallback,
    authorizationURL: (pkce) => openRouterAuthorizationURL(callbackURL, pkce, keyLabel),
    exchange: (code, verifier) => exchangeOpenRouterCode(code, verifier)
  })
}
