import { noop, once } from 'es-toolkit'

import { createDeferred } from '@/app/runtime/deferred'

import { pkceChallenge, pkceSecrets, type PKCE } from './pkce'

export type SignInFailure = 'cancelled' | 'expired' | 'failed'
export type SignInResult<T, F extends string = never> =
  | { ok: true; value: T }
  | { ok: false; reason: SignInFailure | F }

export interface SignIn<T, F extends string = never> {
  /** Opens the provider's sign-in page again for the same attempt. */
  reopen: () => void
  result: Promise<SignInResult<T, F>>
}

/** What came back to the redirect: a code for this attempt, or why there is none. */
export type CallbackOutcome =
  | { kind: 'code'; code: string }
  | { kind: 'denied' | 'mismatch' | 'expired' | 'cancelled' }

/** Where the redirect returns: a popup, a deep link, or a loopback port. */
export interface SignInCallback<Outcome = CallbackOutcome> {
  /** Shows the sign-in page; called again to reopen it. */
  open: (url: string) => void | Promise<void>
  wait: () => Promise<Outcome>
  /** Releases the popup, listener, or port. */
  close: () => void
}

export interface SignInFlow<T, F extends string = never> {
  signal: AbortSignal
  /**
   * Readies the redirect before the page opens. It is called before anything is awaited, so it
   * can open a popup within the click that started sign-in.
   */
  callback: (state: string) => Promise<SignInCallback | { failure: F }>
  authorizationURL: (pkce: PKCE) => string
  exchange: (code: string, verifier: string) => Promise<T>
}

const OUTCOME_FAILURES = {
  denied: 'cancelled',
  cancelled: 'cancelled',
  mismatch: 'failed',
  expired: 'expired'
} as const satisfies Record<Exclude<CallbackOutcome['kind'], 'code'>, SignInFailure>

/** Reads a standard redirect query, rejecting one that belongs to another attempt. */
export function callbackOutcome(query: string, expectedState: string): CallbackOutcome {
  const params = new URLSearchParams(query)
  if (params.get('state') !== expectedState) return { kind: 'mismatch' }
  const code = params.get('code')
  return code ? { kind: 'code', code } : { kind: 'denied' }
}

class SignInAbortedError extends Error {
  constructor() {
    super('Sign-in was cancelled')
    this.name = 'SignInAbortedError'
  }
}

/** `promise`, or a rejection as soon as `signal` aborts. */
export async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new SignInAbortedError()
  const aborted = createDeferred<never>()
  const abort = () => aborted.reject(new SignInAbortedError())
  signal.addEventListener('abort', abort, { once: true })
  try {
    return await Promise.race([promise, aborted.promise])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

/** A redirect readied for an attempt, or the result the attempt ends with instead. */
export type PreparedSignIn<Callback, Result> = { callback: Callback } | { result: Result }

/**
 * Runs a sign-in attempt around its readied redirect: `run` opens the page with `open`, which
 * `reopen` repeats. The redirect closes once the attempt settles or is cancelled, and an error
 * ends it as `failed`, or as `cancelled` after `signal` aborted.
 */
export function runSignInAttempt<
  Callback extends Pick<SignInCallback<unknown>, 'open' | 'close'>,
  Result
>(
  signal: AbortSignal,
  prepared: Promise<PreparedSignIn<Callback, Result>>,
  run: (callback: Callback, open: (url: string) => Promise<void>) => Promise<Result>,
  failed: (reason: 'cancelled' | 'failed') => Result
): { reopen: () => void; result: Promise<Result> } {
  let reopen: () => void = noop

  const result = (async (): Promise<Result> => {
    let close: () => void = noop
    try {
      const ready = await prepared
      if ('result' in ready) return ready.result
      const { callback } = ready
      // Closed as soon as the attempt is cancelled, before a new attempt can claim the same port.
      close = once(callback.close)
      signal.addEventListener('abort', close, { once: true })
      return await run(callback, async (url) => {
        reopen = () => void callback.open(url)
        await callback.open(url)
      })
    } catch {
      return failed(signal.aborted ? 'cancelled' : 'failed')
    } finally {
      signal.removeEventListener('abort', close)
      close()
    }
  })()

  return { reopen: () => reopen(), result }
}

/** Signs in with OAuth PKCE: opens the provider, waits for its redirect, and trades the code. */
export function startSignIn<T, F extends string = never>(flow: SignInFlow<T, F>): SignIn<T, F> {
  const { signal } = flow
  const secrets = pkceSecrets()
  const prepared = flow
    .callback(secrets.state)
    .then((callback): PreparedSignIn<SignInCallback, SignInResult<T, F>> =>
      'failure' in callback ? { result: { ok: false, reason: callback.failure } } : { callback }
    )

  return runSignInAttempt(
    signal,
    prepared,
    async (callback, open): Promise<SignInResult<T, F>> => {
      const pkce = { ...secrets, challenge: await pkceChallenge(secrets.verifier) }
      if (signal.aborted) return { ok: false, reason: 'cancelled' }
      await open(flow.authorizationURL(pkce))
      const outcome = await abortable(callback.wait(), signal)
      if (outcome.kind !== 'code') return { ok: false, reason: OUTCOME_FAILURES[outcome.kind] }
      const value = await abortable(flow.exchange(outcome.code, pkce.verifier), signal)
      return { ok: true, value }
    },
    (reason) => ({ ok: false, reason })
  )
}
