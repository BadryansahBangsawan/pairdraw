import { WEB_APP_URL } from '#mcp/transport/origins'

/** Hosts a development server may run the app on with plain HTTP. */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  )
}

/**
 * The web app the companion pairs with: the official one, or a development server named by the
 * operator. Plain HTTP is accepted only on this machine. Returns null for anything else.
 */
export function resolveConnectAppURL(raw: string | undefined): URL | null {
  const text = raw?.trim() || WEB_APP_URL
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.username || url.password) return null
  if (url.protocol === 'https:') return url
  return url.protocol === 'http:' && isLocalHost(url.hostname) ? url : null
}

/**
 * The link that pairs a tab: the app with `#connect=<code>` in its fragment, which browsers never
 * send to a server, and the port when it is not the default one.
 */
export function connectLink(appURL: URL, code: string, port: number, defaultPort: number): string {
  const link = new URL(appURL)
  const params = new URLSearchParams({ connect: code })
  if (port !== defaultPort) params.set('port', String(port))
  link.hash = params.toString()
  return link.toString()
}
