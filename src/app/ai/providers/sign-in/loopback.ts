import { invoke } from '@tauri-apps/api/core'
import * as v from 'valibot'

import { aiMessages } from '@pairdraw/vue/i18n'

import { openExternalLink } from '@/app/shell/ui'

import type { SignInCallback } from './attempt'

/** Providers whose desktop sign-in returns to a loopback port the desktop shell holds. */
type LoopbackProvider = 'chatgpt' | 'openrouter'

/** What `<provider>_oauth_wait` returns once the redirect arrives, the wait ends, or it is cancelled. */
const loopbackOutcomeSchema = v.variant('kind', [
  v.object({ kind: v.literal('code'), code: v.string() }),
  v.object({ kind: v.picklist(['denied', 'expired', 'cancelled']) })
])

/** The port `<provider>_oauth_listen` took. */
const portSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65_535))

/** A redirect readied on a loopback port, and the port, which the redirect URL names. */
export interface LoopbackRedirect {
  callback: SignInCallback
  port: number
}

/**
 * Takes the loopback port the redirect returns to before the page opens; the desktop shell
 * checks the state and answers the browser. `port-in-use` when another program holds a port the
 * provider fixes.
 */
export async function loopbackRedirect(
  provider: LoopbackProvider,
  providerName: string,
  state: string
): Promise<LoopbackRedirect | 'port-in-use'> {
  const ai = aiMessages.get()
  // The browser shows these after the redirect, so they come in the app's language.
  const pages = {
    signedIn: ai.aiSetupCallbackSignedIn({ provider: providerName }),
    cancelled: ai.aiSetupCallbackCancelled({ provider: providerName }),
    stale: ai.aiSetupCallbackStale
  }
  let port: number
  try {
    port = v.parse(portSchema, await invoke(`${provider}_oauth_listen`, { state, pages }))
  } catch (error) {
    if (error === 'port-in-use') return 'port-in-use'
    throw error
  }
  return {
    port,
    callback: {
      open: openExternalLink,
      wait: async () => v.parse(loopbackOutcomeSchema, await invoke(`${provider}_oauth_wait`)),
      // Frees the port; the state keeps a late cancel from ending a newer attempt.
      close: () => void invoke(`${provider}_oauth_cancel`, { state }).catch(() => undefined)
    }
  }
}
