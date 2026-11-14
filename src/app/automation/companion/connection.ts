import { useIntervalFn } from '@vueuse/core'
import * as v from 'valibot'
import { reactive } from 'vue'

import { AUTOMATION_HTTP_PORT } from '@pairdraw/core/constants'

import { APP_VERSION } from '@/app/runtime/version'

import { companionInfoSchema, companionPairingSchema } from './schema'

/**
 * The command that starts the companion at this app's version. npm runs a package's bin only by
 * the package's own name, so it is named with `-p` rather than adding a generic `mcp` command to
 * the PATH of everyone who installs the package.
 */
export const COMPANION_COMMAND = `npx -p @pairdraw/mcp@${APP_VERSION} pairdraw-connect`

/**
 * The companion (`pairdraw-connect`) runs Pairdraw's MCP server and the coding agents on the
 * person's computer for the web app. A tab pairs with it through the one-time link the companion
 * prints, after the person confirms it, and keeps the tokens only in memory: reloading or closing
 * the tab, or restarting the companion, needs a new link.
 */
type CompanionStatus = 'idle' | 'pairing' | 'connected' | 'lost'

/** Why the tab is not connected, for the settings card to explain. */
type CompanionFailure = 'rejected' | 'rate-limited' | 'unreachable' | 'expired'

/** A link waiting for the person to confirm it, as the tab shows it; the code stays private. */
interface CompanionPendingLink {
  port: number
  /** The characters the companion's terminal printed beside the link. */
  fingerprint: string
}

export interface CompanionState {
  status: CompanionStatus
  failure: CompanionFailure | null
  /** The companion's version, once paired. */
  version: string | null
  /** A link the tab was opened with, which pairs only once the person confirms it. */
  pending: CompanionPendingLink | null
  /**
   * Whether the session is the one `bun run dev` gave this tab (`adopt`), rather than one from a
   * link; the development server's MCP server is then the companion.
   */
  dev: boolean
}

/** A link the companion printed: `#connect=<code>`, with `&port=` when it is not the default. */
export interface CompanionLink {
  code: string
  port: number
}

const CODE_PATTERN = /^[0-9a-f]{32}$/
/** How often a paired tab checks that the companion still runs and accepts its token. */
const CHECK_INTERVAL_MS = 10_000
const REQUEST_TIMEOUT_MS = 5_000

/**
 * The pairing link in a location's fragment, or null. The companion always listens on this
 * machine, so the link carries only a port, never a host: a crafted link cannot pair the tab
 * with a server elsewhere.
 */
export function parseCompanionLink(hash: string): CompanionLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const code = params.get('connect')
  if (!code || !CODE_PATTERN.test(code)) return null
  const portText = params.get('port')
  if (portText === null) return { code, port: AUTOMATION_HTTP_PORT }
  if (!/^\d{1,5}$/.test(portText)) return null
  const port = Number(portText)
  return port >= 1024 && port <= 65535 ? { code, port } : null
}

/**
 * Six characters derived from a pairing code, as the companion prints them beside its link
 * (`pairingFingerprint` in `packages/mcp/src/agents/pairing.ts`).
 */
export async function companionFingerprint(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  const hex = [...new Uint8Array(digest).slice(0, 3)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `${hex.slice(0, 3)}-${hex.slice(3)}`
}

/** The slice of `fetch` the connection calls, so tests can stand in for it. */
export type CompanionFetch = (url: string, init?: RequestInit) => Promise<Response>

interface CompanionConnectionOptions {
  fetch?: CompanionFetch
}

/** A companion's tokens and the port it listens on, on this machine. */
export interface CompanionSession {
  /** Reaches the agent routes and the app's bridge. */
  token: string
  /** Reaches only the MCP server; the tab hands it to the agents it starts. */
  agentToken: string
  port: number
}

export function createCompanionConnection({
  // Looked up at each call, so a fetch installed later, as by a test, is the one used.
  fetch: request = (input, init) => fetch(input, init)
}: CompanionConnectionOptions = {}) {
  const state = reactive<CompanionState>({
    status: 'idle',
    failure: null,
    version: null,
    pending: null,
    dev: false
  })
  let session: CompanionSession | null = null
  let pendingLink: CompanionLink | null = null
  const checker = useIntervalFn(() => void check(), CHECK_INTERVAL_MS, { immediate: false })

  function base(port: number): string {
    return `http://127.0.0.1:${port}`
  }

  /** The companion's HTTP address on this machine. */
  function url(): string {
    return base(session?.port ?? AUTOMATION_HTTP_PORT)
  }

  function token(): string | null {
    return state.status === 'connected' ? (session?.token ?? null) : null
  }

  /** The token agents reach Pairdraw's MCP server with, which starts no programs. */
  function agentToken(): string | null {
    return state.status === 'connected' ? (session?.agentToken ?? null) : null
  }

  function connected(): boolean {
    return state.status === 'connected'
  }

  async function check(): Promise<void> {
    const current = session
    if (!current) return
    try {
      const response = await request(`${base(current.port)}/companion`, {
        headers: { Authorization: `Bearer ${current.token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
      if (session !== current) return
      if (response.status === 401) {
        // The development server's MCP server keeps its session while it runs, so a refusal
        // comes from another server on its port; keep checking until that one stops.
        if (state.dev) throw new Error('HTTP 401')
        // The companion restarted or signed the tab out, so this token is gone for good.
        forget('expired')
        return
      }
      const info = v.safeParse(
        v.pipe(v.string(), v.parseJson(), companionInfoSchema),
        await response.text()
      )
      if (!response.ok || !info.success) throw new Error(`HTTP ${response.status}`)
      state.version = info.output.version
      state.status = 'connected'
      state.failure = null
    } catch {
      if (session !== current) return
      // Stopped or unreachable for now; the token works again if it comes back.
      state.status = 'lost'
      state.failure = 'unreachable'
    }
  }

  function forget(failure: CompanionFailure | null) {
    checker.pause()
    session = null
    state.status = 'idle'
    state.failure = failure
    state.version = null
    state.dev = false
  }

  /** A pairing that did not finish leaves the tab as it was: still paired, if it was. */
  function failPairing(failure: CompanionFailure): false {
    state.failure = failure
    state.status = session ? 'connected' : 'idle'
    return false
  }

  /**
   * Trades the link's code for the tab's tokens. An existing pairing is replaced only once the
   * new one succeeds, so a link that fails cannot sign the tab out.
   */
  async function pair(link: CompanionLink): Promise<boolean> {
    if (!session) state.status = 'pairing'
    let response: Response
    try {
      response = await request(`${base(link.port)}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: link.code }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch {
      return failPairing('unreachable')
    }
    if (!response.ok) return failPairing(response.status === 429 ? 'rate-limited' : 'rejected')
    const paired = v.safeParse(
      v.pipe(v.string(), v.parseJson(), companionPairingSchema),
      await response.text()
    )
    if (!paired.success) return failPairing('rejected')
    const previous = session
    const previousDev = state.dev
    session = { token: paired.output.token, agentToken: paired.output.agentToken, port: link.port }
    if (previous && !previousDev) void revoke(previous)
    state.dev = false
    state.version = paired.output.version
    state.status = 'connected'
    state.failure = null
    checker.resume()
    return true
  }

  /**
   * Uses a session the development server set up for this tab (`dev.ts`), with no `/pair` and no
   * confirmation: the development server made the tokens, gave them to the MCP server it started,
   * and put them in this tab's bundle. Resolves once that server answered, or did not.
   */
  function adopt(next: CompanionSession): Promise<void> {
    const previous = session
    if (previous && !state.dev) void revoke(previous)
    session = { token: next.token, agentToken: next.agentToken, port: next.port }
    state.dev = true
    state.status = 'pairing'
    state.failure = null
    state.version = null
    checker.resume()
    return check()
  }

  /** Tells the companion to drop a session's tokens; best effort, as it may have stopped. */
  async function revoke(old: CompanionSession): Promise<void> {
    await request(`${base(old.port)}/pair/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${old.token}` },
      keepalive: true
    }).catch(() => undefined)
  }

  /** Holds a link until the person confirms it; nothing reaches the companion before that. */
  async function offer(link: CompanionLink): Promise<void> {
    pendingLink = link
    state.pending = { port: link.port, fingerprint: await companionFingerprint(link.code) }
  }

  /** Pairs with the link the person confirmed. */
  function confirm(): Promise<boolean> {
    const link = pendingLink
    pendingLink = null
    state.pending = null
    return link ? pair(link) : Promise.resolve(false)
  }

  /** Drops the link the person did not confirm. */
  function dismiss(): void {
    pendingLink = null
    state.pending = null
  }

  /**
   * Signs the tab out, here and in the companion, which keeps running for other tabs. The
   * development server's session is only forgotten here, as the companion keeps it until it stops.
   */
  function disconnect() {
    const current = session
    const dev = state.dev
    forget(null)
    if (current && !dev) void revoke(current)
  }

  return {
    state,
    url,
    token,
    agentToken,
    connected,
    pair,
    adopt,
    offer,
    confirm,
    dismiss,
    check,
    disconnect
  }
}

export type CompanionConnection = ReturnType<typeof createCompanionConnection>

export const companion = createCompanionConnection()

/**
 * Takes the pairing link from the address the tab opened with, removes the code from the address
 * bar and history so it is not bookmarked, shared, or reused, and holds the link for the person
 * to confirm. Any page can open a link, so pairing never starts without that confirmation.
 */
export async function connectCompanionFromLocation(
  location: Pick<Location, 'hash' | 'href'> = window.location,
  history: Pick<History, 'replaceState' | 'state'> = window.history,
  connection: Pick<CompanionConnection, 'offer'> = companion
): Promise<boolean> {
  if (!location.hash.includes('connect=')) return false
  const link = parseCompanionLink(location.hash)
  const clean = new URL(location.href)
  clean.hash = ''
  history.replaceState(history.state, '', clean.href.replace(/#$/, ''))
  if (!link) return false
  await connection.offer(link)
  return true
}
