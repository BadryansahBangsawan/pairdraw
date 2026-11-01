import { uniq } from 'es-toolkit'

/**
 * Origins allowed to call the local server from a view.
 *
 * The desktop app's webview always calls the server from its own origin, so a
 * manually started server must allow it without extra configuration. Browsers
 * set `Origin` themselves, and only the Tauri webview serves these origins, so
 * allowing them does not expose the server to arbitrary websites. Requests still
 * need the bearer token whenever authentication is enabled.
 */
export const DESKTOP_APP_ORIGINS = [
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost'
] as const

/** Parse a comma-separated override. Returns null when nothing usable is set. */
export function parseCORSOrigins(raw: string | undefined | null): string[] | null {
  if (raw == null) return null
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
  return origins.length > 0 ? origins : null
}

/** Explicit configuration wins; otherwise the desktop app origin is allowed. */
export function resolveCORSOrigins(raw: string | undefined): readonly string[] {
  return parseCORSOrigins(raw) ?? DESKTOP_APP_ORIGINS
}

/** The web app, which pairs with a companion started by `openpencil-connect`. */
export const WEB_APP_URL = 'https://app.openpencil.dev'

/**
 * Whether a request may reach the server from where it came. Browsers send `Origin` on every
 * WebSocket upgrade and cross-site request, so a page from any other site, including one that
 * rebinds its DNS name to this machine, is refused. Local programs send none and are allowed;
 * they still need a token.
 */
export function isAllowedOrigin(
  origin: string | undefined | null,
  allowed: readonly string[]
): boolean {
  if (origin === undefined || origin === null) return true
  // An operator who sets `*` opted out of the check, as for CORS.
  return allowed.includes(origin) || allowed.includes('*')
}

/** The origins the server admits: the configured ones and, always, the desktop app's. */
export function admittedOrigins(corsOrigin: string | readonly string[] | null): string[] {
  const configured = typeof corsOrigin === 'string' ? [corsOrigin] : (corsOrigin ?? [])
  return uniq([...configured, ...DESKTOP_APP_ORIGINS])
}

/**
 * Whether a request's `Host` names this machine: `127.0.0.1`, `localhost`, `[::1]`, or a
 * `*.localhost` name, which resolve only to loopback. A page that rebinds its own DNS name to
 * 127.0.0.1 still sends that name, so it is refused. Requests without one are allowed.
 */
export function isLoopbackHost(host: string | undefined | null): boolean {
  if (host === undefined || host === null || host === '') return true
  const hostname = /^(\[[^\]]*\]|[^:]*)(?::\d+)?$/.exec(host.trim().toLowerCase())?.[1]
  if (!hostname) return false
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  )
}
