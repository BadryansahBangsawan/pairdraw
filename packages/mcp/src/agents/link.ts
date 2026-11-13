import { randomBytes } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { uniq } from 'es-toolkit'

import { resolveCORSOrigins, WEB_APP_URL } from '#mcp/transport/origins'

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

/**
 * The origins the companion lets call it: the configured ones and the app it pairs with. `*`
 * would let any site drive the agent bridge, so it is dropped here, whatever was configured.
 */
export function connectCORSOrigins(raw: string | undefined, appURL: URL): string[] {
  const configured = resolveCORSOrigins(raw).filter((origin) => origin !== '*')
  return uniq([...configured, appURL.origin])
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/**
 * Writes a page that forwards to the link, readable only by this user, so the browser is opened
 * with the page's path rather than the link: a command line, which other users of the computer
 * can list, then never holds the pairing code. Returns the path and a function that deletes it.
 */
export async function writeConnectPage(
  dir: string,
  link: string
): Promise<{ path: string; remove: () => Promise<void> }> {
  const path = join(dir, `connect-${randomBytes(8).toString('hex')}.html`)
  const href = escapeAttribute(link)
  const html =
    `<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer">` +
    `<meta http-equiv="refresh" content="0;url=${href}"><title>Pairdraw</title>` +
    `<a href="${href}">Open Pairdraw</a>\n`
  await writeFile(path, html, { mode: 0o600, flag: 'wx' })
  return { path, remove: () => rm(path, { force: true }) }
}
