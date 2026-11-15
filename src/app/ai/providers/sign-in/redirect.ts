import * as v from 'valibot'

import { createDeferred } from '@/app/runtime/deferred'
import { openExternalLink } from '@/app/shell/ui'
import { WEB_APP_ORIGIN } from '@/constants'

import type { SignInCallback } from './attempt'

/** Emitted by the desktop shell for a `pairdraw://oauth/<provider>?…` link. */
const OAUTH_CALLBACK_EVENT = 'oauth-callback'
const POPUP_FEATURES = 'popup,width=520,height=720'

/** What the desktop shell forwards from a `pairdraw://oauth/<provider>?…` link. */
const oauthCallbackSchema = v.object({ provider: v.string(), query: v.string() })

/** How one attempt reads the redirect that comes back to it. */
export interface RedirectReader<Outcome> {
  /** The outcome of a redirect query, which may belong to another attempt. */
  read: (query: string) => Outcome
  /** The outcome once `lifetimeMs` passes with no redirect. */
  expired: Outcome
  lifetimeMs: number
}

/** A redirect that resolves once, or as expired when its lifetime passes. */
function pendingRedirect<Outcome>({ expired, lifetimeMs }: RedirectReader<Outcome>) {
  const received = createDeferred<Outcome>()
  const timer = setTimeout(() => received.resolve(expired), lifetimeMs)
  return { received, stop: () => clearTimeout(timer) }
}

/**
 * A popup that returns to this origin, whose callback page relays the redirect query over
 * `channel`. It opens before anything is awaited, or the browser blocks it; null when it did.
 */
export function popupRedirect<Outcome>(
  name: string,
  channelName: string,
  reader: RedirectReader<Outcome>
): SignInCallback<Outcome> | null {
  const opened = window.open('', name, POPUP_FEATURES)
  if (!opened) return null
  let popup = opened
  let navigated = false
  const { received, stop } = pendingRedirect(reader)
  const channel = new BroadcastChannel(channelName)
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (typeof event.data === 'string') received.resolve(reader.read(event.data))
  })
  return {
    open: (url) => {
      if (navigated) popup = window.open(url, name, POPUP_FEATURES) ?? popup
      else popup.location.href = url
      navigated = true
    },
    wait: () => received.promise,
    close: () => {
      stop()
      channel.close()
      popup.close()
    }
  }
}

/**
 * Where an authorization server sends the desktop app's system browser back: the hosted web app's
 * page at `relayPath`, which opens the `pairdraw://oauth/<provider>` link, when the build names a
 * web app; otherwise that link itself, a private-use scheme as native apps register (RFC 8252).
 */
export function desktopRedirectURL(provider: string, relayPath: string): string {
  return WEB_APP_ORIGIN
    ? new URL(relayPath, WEB_APP_ORIGIN).href
    : `pairdraw://oauth/${encodeURIComponent(provider)}`
}

/**
 * The system browser, which returns through a `pairdraw://oauth/<provider>` link, directly or
 * from the hosted relay page; the desktop shell forwards its query as an `oauth-callback` event.
 */
export async function deepLinkRedirect<Outcome>(
  provider: string,
  reader: RedirectReader<Outcome>
): Promise<SignInCallback<Outcome>> {
  const { listen } = await import('@tauri-apps/api/event')
  const { received, stop } = pendingRedirect(reader)
  const unlisten = await listen<unknown>(OAUTH_CALLBACK_EVENT, (event) => {
    const callback = v.safeParse(oauthCallbackSchema, event.payload)
    if (callback.success && callback.output.provider === provider) {
      received.resolve(reader.read(callback.output.query))
    }
  })
  return {
    open: openExternalLink,
    wait: () => received.promise,
    close: () => {
      stop()
      unlisten()
    }
  }
}
