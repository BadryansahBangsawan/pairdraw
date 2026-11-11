/**
 * `?embed&origin=<host origin>` turns the window into an embed for the page at that origin.
 * `allow-edit` lets the host ask for editing, which is off until it does; `chrome` keeps the
 * editor's panels, which an embed otherwise hides around a bare canvas.
 */
export interface EmbedParams {
  /** The one origin whose page may connect, exactly as `URL.origin` spells it; null when invalid. */
  origin: string | null
  allowEdit: boolean
  chrome: boolean
}

const LOOPBACK_HOSTS: Record<string, true> = { localhost: true, '127.0.0.1': true, '[::1]': true }
/** A DNS name or IPv4 address as `URL` normalizes it (IDNs in punycode), or an IPv6 literal. */
const HOST_NAME = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])$/
/** The UUID host Chromium gives a VS Code webview; the scheme has no standard origin form. */
const VSCODE_WEBVIEW_HOST = /^[a-z0-9-]+$/

/**
 * The host origin a link names, or null. It must be one serialized origin and nothing more: no
 * path, wildcard, credentials, or trailing slash, so it compares exactly with `MessageEvent.origin`.
 * Plain `http:` is accepted only on loopback, where development hosts run.
 */
export function parseEmbedOrigin(value: string | null): string | null {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  // A VS Code webview reports `vscode-webview://<uuid>` as its origin; URL calls that scheme's
  // origin `null`, so the URL itself is the origin and nothing may follow the host.
  if (url.protocol === 'vscode-webview:') {
    const bare =
      url.pathname === '' &&
      url.search === '' &&
      url.hash === '' &&
      url.username === '' &&
      url.password === ''
    return bare && VSCODE_WEBVIEW_HOST.test(url.hostname) ? value : null
  }
  // A URL parser takes `*` as a host character; an origin pattern is never a host.
  if (url.origin !== value || !HOST_NAME.test(url.hostname)) return null
  if (url.protocol === 'https:') return value
  if (url.protocol === 'http:' && LOOPBACK_HOSTS[url.hostname] === true) return value
  return null
}

/** The embed a URL asks for, or null outside embed mode. A repeated `origin` is refused. */
export function parseEmbedParams(search: string): EmbedParams | null {
  const params = new URLSearchParams(search)
  if (!params.has('embed')) return null
  const origins = params.getAll('origin')
  return {
    origin: origins.length === 1 ? parseEmbedOrigin(origins[0]) : null,
    allowEdit: params.has('allow-edit'),
    chrome: params.has('chrome')
  }
}
