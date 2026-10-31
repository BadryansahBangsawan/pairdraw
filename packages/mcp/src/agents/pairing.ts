import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** How long a printed link may be opened. */
export const PAIRING_CODE_TTL_MS = 2 * 60_000
/** Wrong codes allowed in a window before `/pair` refuses everything until it ends. */
const MAX_FAILED_ATTEMPTS = 10
const ATTEMPT_WINDOW_MS = 60_000
/** Tabs paired at once; the oldest is forgotten when another pairs. */
const MAX_SESSIONS = 16

export type PairingResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'rejected' | 'rate-limited' }

export interface PairingOptions {
  ttlMs?: number
  now?: () => number
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/**
 * One-time codes and the session tokens they buy. A code is printed in the link the companion
 * opens, works once, and expires; the token lives only in this process and in the paired tab's
 * memory, so restarting the companion signs every tab out.
 */
export function createPairing({
  ttlMs = PAIRING_CODE_TTL_MS,
  now = Date.now
}: PairingOptions = {}) {
  let code: { digest: Buffer; expiresAt: number } | null = null
  // Keyed by the token's digest, so a lookup never compares the secret itself.
  const sessions = new Map<string, number>()
  let failures = 0
  let windowStart = now()

  /** Issues a new code and invalidates the previous one. */
  function issueCode(): string {
    const value = randomBytes(16).toString('hex')
    code = { digest: digest(value), expiresAt: now() + ttlMs }
    return value
  }

  function rateLimited(): boolean {
    if (now() - windowStart >= ATTEMPT_WINDOW_MS) {
      windowStart = now()
      failures = 0
    }
    return failures >= MAX_FAILED_ATTEMPTS
  }

  /** Trades a code for a session token: once, before it expires, compared in constant time. */
  function exchange(candidate: string): PairingResult {
    if (rateLimited()) return { ok: false, reason: 'rate-limited' }
    const current = code
    const matches =
      current !== null &&
      timingSafeEqual(digest(candidate), current.digest) &&
      now() < current.expiresAt
    if (!matches) {
      failures++
      return { ok: false, reason: 'rejected' }
    }
    code = null
    const token = randomBytes(32).toString('hex')
    sessions.set(digest(token).toString('hex'), now())
    while (sessions.size > MAX_SESSIONS) {
      const oldest = sessions.keys().next().value
      if (oldest === undefined) break
      sessions.delete(oldest)
    }
    return { ok: true, token }
  }

  function isSession(token: string | null | undefined): boolean {
    if (!token) return false
    return sessions.has(digest(token).toString('hex'))
  }

  function forget(token: string): void {
    sessions.delete(digest(token).toString('hex'))
  }

  return { issueCode, exchange, isSession, forget }
}

export type Pairing = ReturnType<typeof createPairing>
