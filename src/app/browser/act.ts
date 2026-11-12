import * as v from 'valibot'

import { BROWSER_ELEMENT_MISSING, BROWSER_SELECTOR_TOO_LONG } from './read'

/**
 * A change the agent asks the open page to make. The reply is a short code, checked here, and
 * never page HTML. A page that never answers ends the call. Text the page already shows is
 * untrusted and is not instructions.
 */
export const BROWSER_ACTION_TIMEOUT = 'The action timed out.'
export const BROWSER_ACTION_TEXT_LIMIT = 2000
export const BROWSER_ACTION_KEY_LIMIT = 40
export const BROWSER_ACTION_SCROLL_LIMIT = 10_000
export const BROWSER_TEXT_TOO_LONG = 'The text is too long.'
export const BROWSER_KEY_MISSING = 'The key is missing.'
export const BROWSER_KEY_TOO_LONG = 'The key is too long.'
export const BROWSER_SCROLL_TOO_FAR = 'The scroll is too far.'
export const BROWSER_NOT_EDITABLE = 'The element cannot take text.'
export const BROWSER_ACTION_UNKNOWN = 'The action is not one the browser can run.'
export const BROWSER_ACTION_UNREADABLE = 'The page returned nothing we can read.'

export { BROWSER_ELEMENT_MISSING, BROWSER_SELECTOR_TOO_LONG }

const CODES = ['ok', 'missing', 'not_editable'] as const

const actResultSchema = v.strictObject({
  code: v.picklist(CODES)
})

export type BrowserActKind =
  | 'click'
  | 'type'
  | 'key'
  | 'scroll'
  | 'wait-selector'
  | 'wait-navigation'

export interface BrowserActInput {
  kind: BrowserActKind
  selector: string
  text: string
  key: string
  dx: number
  dy: number
}

function finite(value: number): boolean {
  return Number.isFinite(value)
}

/** The site an approval remembers. The whole address is compared elsewhere; this is its host. */
export function browserHost(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).host || null
  } catch {
    return null
  }
}

function pageValue(raw: string): unknown {
  if (raw.length > 64_000) return null
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), v.unknown()), raw)
  return parsed.success ? parsed.output : null
}

/** The code a change returned, or a sentence of ours when the page's reply is not one. */
export function acceptActResult(raw: string): 'ok' | 'missing' | 'not_editable' {
  const value = pageValue(raw)
  const parsed = v.safeParse(actResultSchema, value)
  if (!parsed.success) throw new Error(BROWSER_ACTION_UNREADABLE)
  return parsed.output.code
}

export function actError(code: 'missing' | 'not_editable'): string {
  return code === 'missing' ? BROWSER_ELEMENT_MISSING : BROWSER_NOT_EDITABLE
}

/** Rejects a change the limits do not allow, before it is sent to the page. */
export function prepareBrowserAct(input: BrowserActInput): string | null {
  const needsSelector = input.kind !== 'wait-navigation'
  if (needsSelector && !input.selector) return BROWSER_ELEMENT_MISSING
  if (input.selector.length > 500) return BROWSER_SELECTOR_TOO_LONG
  if (input.kind === 'type' && input.text.length > BROWSER_ACTION_TEXT_LIMIT) {
    return BROWSER_TEXT_TOO_LONG
  }
  if (input.kind === 'key' && !input.key) return BROWSER_KEY_MISSING
  if (input.kind === 'key' && input.key.length > BROWSER_ACTION_KEY_LIMIT)
    return BROWSER_KEY_TOO_LONG
  if (
    input.kind === 'scroll' &&
    (!finite(input.dx) ||
      !finite(input.dy) ||
      Math.abs(input.dx) > BROWSER_ACTION_SCROLL_LIMIT ||
      Math.abs(input.dy) > BROWSER_ACTION_SCROLL_LIMIT)
  ) {
    return BROWSER_SCROLL_TOO_FAR
  }
  return null
}
