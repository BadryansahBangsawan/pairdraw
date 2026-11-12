/**
 * Which URLs the built-in browser may open. The browser is desktop-only and shows the page in a
 * webview that holds none of the app's data, so the policy is deliberately narrow: `http:` and
 * `https:` only (`localhost` included, which is where development hosts run), and nothing else.
 *
 * A refusal carries its reason, so the toolbar can say why instead of doing nothing: `file:` and
 * `javascript:` would touch the user's disk or run code against the browser itself, and
 * `data:`/`blob:`/custom schemes address documents this service cannot load.
 */

/** Why a URL was refused: nothing typed, a scheme the browser does not open, or no URL at all. */
export type BrowserURLRejection = 'empty' | 'scheme' | 'invalid'

export type BrowserURLPolicy =
  | { ok: true; url: string }
  | { ok: false; reason: BrowserURLRejection; input: string }

/** The schemes the browser opens. Exported so a test can prove the list holds no others. */
export const BROWSER_URL_SCHEMES = ['http:', 'https:'] as const

/** `scheme:` as RFC 3986 spells it. */
const SCHEME = /^([a-z][a-z0-9+.-]*):/i
/** Only a port may follow a scheme-looking prefix and still be a host (`example.com:8080`). */
const PORT_ONLY = /^\d+(?:[/?#]|$)/

function isBrowserScheme(protocol: string): boolean {
  return (BROWSER_URL_SCHEMES as readonly string[]).includes(protocol)
}

/**
 * The URL the browser should load, or the reason it will not. A bare host such as `example.com`
 * gets `https://`, except on loopback, which keeps `http://` because that is how a local
 * development server answers.
 */
export function browserURLPolicy(input: string): BrowserURLPolicy {
  const value = input.trim()
  if (value === '') return { ok: false, reason: 'empty', input }

  const scheme = SCHEME.exec(value)
  let target: string
  // `example.com:8080` reads as a scheme by spelling, but a port is all that follows the colon.
  if (scheme && !PORT_ONLY.test(value.slice(scheme[0].length))) {
    target = value
  } else if (isBareHost(value)) {
    target = guessScheme(value)
  } else {
    return { ok: false, reason: 'invalid', input }
  }

  let url: URL
  try {
    url = new URL(target)
  } catch {
    return { ok: false, reason: 'invalid', input }
  }
  if (!isBrowserScheme(url.protocol)) return { ok: false, reason: 'scheme', input }
  // `http:example.com` parses to path `example.com`, never to a page; a page needs a host.
  if (url.hostname === '') return { ok: false, reason: 'invalid', input }
  return { ok: true, url: url.href }
}

/** A host with a dot, or a loopback name: typed without a scheme, it names a URL and not a search. */
function isBareHost(value: string): boolean {
  return /^(?:[^\s/?#:]+\.[^\s/?#:]+|localhost)(?::\d+)?(?:[/?#]|$)/i.test(value)
}

/** `https://` for a public host, `http://` for loopback, which is where a dev server answers. */
function guessScheme(host: string): string {
  const loopback = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::|\/|$)/i.test(host)
  return `${loopback ? 'http' : 'https'}://${host}`
}

/** The address a page is shown under: its whole URL, minus the fragment no reload needs. */
export function browserDisplayURL(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    return parsed.href
  } catch {
    return url
  }
}
