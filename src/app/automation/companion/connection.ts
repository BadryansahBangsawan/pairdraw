import { useIntervalFn } from '@vueuse/core'
import * as v from 'valibot'
import { reactive } from 'vue'

import { AUTOMATION_HTTP_PORT } from '@open-pencil/core/constants'

import { APP_VERSION } from '@/app/runtime/version'

import { companionInfoSchema, companionPairingSchema } from './schema'

/**
 * The command that starts the companion at this app's version. npm runs a package's bin only by
 * the package's own name, so it is named with `-p` rather than adding a generic `mcp` command to
 * the PATH of everyone who installs the package.
 */
export const COMPANION_COMMAND = `npx -p @open-pencil/mcp@${APP_VERSION} openpencil-connect`

/**
 * The companion (`openpencil-connect`) runs OpenPencil's MCP server and the coding agents on the
 * person's computer for the web app. A tab pairs with it through the one-time link the companion
 * prints, and keeps the session token only in memory: reloading or closing the tab, or
 * restarting the companion, needs a new link.
 */
export type CompanionStatus = 'idle' | 'pairing' | 'connected' | 'lost'

/** Why the tab is not connected, for the settings card to explain. */
export type CompanionFailure = 'rejected' | 'rate-limited' | 'unreachable' | 'expired'

export interface CompanionState {
  status: CompanionStatus
  failure: CompanionFailure | null
  /** The companion's version, once paired. */
  version: string | null
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

/** The slice of `fetch` the connection calls, so tests can stand in for it. */
export type CompanionFetch = (url: string, init?: RequestInit) => Promise<Response>

export interface CompanionConnectionOptions {
  fetch?: CompanionFetch
}

export function createCompanionConnection({
  // Looked up at each call, so a fetch installed later, as by a test, is the one used.
  fetch: request = (input, init) => fetch(input, init)
}: CompanionConnectionOptions = {}) {
  const state = reactive<CompanionState>({ status: 'idle', failure: null, version: null })
  let session: { token: string; port: number } | null = null
  const checker = useIntervalFn(() => void check(), CHECK_INTERVAL_MS, { immediate: false })

  /** The companion's HTTP address on this machine. */
  function url(): string {
    return `http://127.0.0.1:${session?.port ?? AUTOMATION_HTTP_PORT}`
  }

  function token(): string | null {
    return state.status === 'connected' ? (session?.token ?? null) : null
  }

  function connected(): boolean {
    return state.status === 'connected'
  }

  async function check(): Promise<void> {
    const current = session
    if (!current) return
    try {
      const response = await request(`${url()}/companion`, {
        headers: { Authorization: `Bearer ${current.token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
      if (session !== current) return
      if (response.status === 401) {
        // The companion restarted, so this token is gone for good.
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
  }

  /** Trades the link's code for a session token. */
  async function pair(link: CompanionLink): Promise<boolean> {
    forget(null)
    state.status = 'pairing'
    const base = `http://127.0.0.1:${link.port}`
    let response: Response
    try {
      response = await request(`${base}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: link.code }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch {
      forget('unreachable')
      return false
    }
    if (!response.ok) {
      forget(response.status === 429 ? 'rate-limited' : 'rejected')
      return false
    }
    const paired = v.safeParse(
      v.pipe(v.string(), v.parseJson(), companionPairingSchema),
      await response.text()
    )
    if (!paired.success) {
      forget('rejected')
      return false
    }
    session = { token: paired.output.token, port: link.port }
    state.version = paired.output.version
    state.status = 'connected'
    state.failure = null
    checker.resume()
    return true
  }

  /** Forgets the token; the companion keeps running for other tabs. */
  function disconnect() {
    forget(null)
  }

  return { state, url, token, connected, pair, check, disconnect }
}

export type CompanionConnection = ReturnType<typeof createCompanionConnection>

export const companion = createCompanionConnection()

/**
 * Pairs with the companion when the page was opened from its link, and removes the code from
 * the address bar and history so it is not bookmarked, shared, or reused.
 */
export function connectCompanionFromLocation(
  location: Pick<Location, 'hash' | 'href'> = window.location,
  history: Pick<History, 'replaceState' | 'state'> = window.history,
  connection: Pick<CompanionConnection, 'pair'> = companion
): Promise<boolean> {
  if (!location.hash.includes('connect=')) return Promise.resolve(false)
  const link = parseCompanionLink(location.hash)
  const clean = new URL(location.href)
  clean.hash = ''
  history.replaceState(history.state, '', clean.href.replace(/#$/, ''))
  return link ? connection.pair(link) : Promise.resolve(false)
}
