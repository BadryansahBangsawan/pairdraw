import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** How long a printed link may be opened. */
export const PAIRING_CODE_TTL_MS = 2 * 60_000
/** A paired tab that sends nothing this long is signed out; an open tab checks in every 10 s. */
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60_000
/** Wrong codes allowed in a window before `/pair` refuses everything until it ends. */
const MAX_FAILED_ATTEMPTS = 10
const ATTEMPT_WINDOW_MS = 60_000
/** Tabs paired at once; the oldest is forgotten when another pairs. */
const MAX_SESSIONS = 16

export type PairingResult =
  | { ok: true; token: string; agentToken: string }
  | { ok: false; reason: 'rejected' | 'rate-limited' }

/** The two tokens of a session that exists without `/pair`. */
export interface TrustedSession {
  token: string
  agentToken: string
}

export interface PairingOptions {
  ttlMs?: number
  idleTimeoutMs?: number
  now?: () => number
  /**
   * Sessions the process that started the server set up for its own tab, as `bun run dev` does
   * through the environment. They never sit idle too long, are never forgotten for newer tabs,
   * and cannot be revoked; they end with the server.
   */
  trusted?: readonly TrustedSession[]
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

function key(token: string): string {
  return digest(token).toString('hex')
}

/**
 * Six characters derived from a pairing code, shown by the companion and by the tab that opens
 * its link, so the person can tell the link is the one their terminal printed. The app derives
 * the same characters (`companionFingerprint` in `src/app/automation/companion/`).
 */
export function pairingFingerprint(code: string): string {
  const hex = key(code).slice(0, 6).toUpperCase()
  return `${hex.slice(0, 3)}-${hex.slice(3)}`
}

interface Session {
  lastUsed: number
  /** The digest of the token this tab hands its agents for OpenPencil's MCP server. */
  agentKey: string
}

/**
 * One-time codes and the tokens they buy. A code is printed in the link the companion opens,
 * works once, and expires. Pairing returns two tokens: the tab's session token, which reaches
 * the agent routes, and an agent token, which reaches only the MCP server and is what the tab
 * hands the agents it starts. Both live only in this process and the tab's memory, so
 * restarting the companion signs every tab out. Trusted sessions skip the code: the process that
 * started the server made their tokens and gave them to its own tab.
 */
export function createPairing({
  ttlMs = PAIRING_CODE_TTL_MS,
  idleTimeoutMs = SESSION_IDLE_TIMEOUT_MS,
  now = Date.now,
  trusted = []
}: PairingOptions = {}) {
  let code: { digest: Buffer; expiresAt: number } | null = null
  // Keyed by the token's digest, so a lookup never compares the secret itself.
  const sessions = new Map<string, Session>()
  const agentTokens = new Map<string, string>()
  const trustedSessions = new Set(trusted.map((session) => key(session.token)))
  const trustedAgentTokens = new Set(trusted.map((session) => key(session.agentToken)))
  // A token that is both would let the agents a tab starts reach the routes that start programs.
  if (
    trusted.some((session) => !session.token || !session.agentToken) ||
    [...trustedSessions].some((sessionKey) => trustedAgentTokens.has(sessionKey))
  ) {
    throw new RangeError('A trusted session needs a session token and a different agent token')
  }
  let failures = 0
  let windowStart = now()

  /**
   * Issues a new code and invalidates the previous one. It also lifts a lockout, since the person
   * at the terminal asked for it, so a local program spending attempts cannot keep them out.
   */
  function issueCode(): string {
    const value = randomBytes(16).toString('hex')
    code = { digest: digest(value), expiresAt: now() + ttlMs }
    failures = 0
    windowStart = now()
    return value
  }

  function rateLimited(): boolean {
    if (now() - windowStart >= ATTEMPT_WINDOW_MS) {
      windowStart = now()
      failures = 0
    }
    return failures >= MAX_FAILED_ATTEMPTS
  }

  function drop(sessionKey: string) {
    const session = sessions.get(sessionKey)
    if (session) agentTokens.delete(session.agentKey)
    sessions.delete(sessionKey)
  }

  /** Trades a code for the tokens: once, before it expires, compared in constant time. */
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
    const agentToken = randomBytes(32).toString('hex')
    const sessionKey = key(token)
    sessions.set(sessionKey, { lastUsed: now(), agentKey: key(agentToken) })
    agentTokens.set(key(agentToken), sessionKey)
    while (sessions.size > MAX_SESSIONS) {
      const oldest = sessions.keys().next().value
      if (oldest === undefined) break
      drop(oldest)
    }
    return { ok: true, token, agentToken }
  }

  /** The live session a token names, after dropping it if it sat idle too long. */
  function live(sessionKey: string): Session | null {
    const session = sessions.get(sessionKey)
    if (!session) return null
    if (now() - session.lastUsed >= idleTimeoutMs) {
      drop(sessionKey)
      return null
    }
    return session
  }

  /** Whether a token is a paired tab's session token; using it keeps the session alive. */
  function isSession(token: string | null | undefined): boolean {
    if (!token) return false
    const sessionKey = key(token)
    if (trustedSessions.has(sessionKey)) return true
    const session = live(sessionKey)
    if (session) session.lastUsed = now()
    return session !== null
  }

  /** Whether a token is an agent token of a live session; it reaches only the MCP server. */
  function isAgentToken(token: string | null | undefined): boolean {
    if (!token) return false
    const agentKey = key(token)
    if (trustedAgentTokens.has(agentKey)) return true
    const sessionKey = agentTokens.get(agentKey)
    return sessionKey !== undefined && live(sessionKey) !== null
  }

  /**
   * Signs a tab out: its session and agent tokens stop working at once. A trusted session stays,
   * since its tab cannot pair again.
   */
  function revoke(token: string): void {
    const sessionKey = key(token)
    if (trustedSessions.has(sessionKey)) return
    drop(sessionKey)
  }

  return { issueCode, exchange, isSession, isAgentToken, revoke }
}

export type Pairing = ReturnType<typeof createPairing>
