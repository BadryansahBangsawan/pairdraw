import { isPlainObject } from 'es-toolkit'
import * as v from 'valibot'

import {
  BROWSER_DESKTOP_ONLY,
  BROWSER_WINDOW_CLOSED,
  browserURLPolicy,
  type BrowserURLRejection
} from '@/app/browser'

import { PAGE_TEXT_LIMIT, PAGE_TITLE_LIMIT, pageTextSchema, type PageText } from './schema'

/**
 * The sentences the browser already uses when an address cannot be opened. Research refuses
 * with those, so a closed window and a `file:` address read the same here as in the toolbar.
 */
const ADDRESS_ERRORS: Record<BrowserURLRejection, string> = {
  empty: 'Type an address to open.',
  scheme: 'The browser opens http and https addresses only.',
  invalid: 'That address is not a page the browser can open.'
}

/** A payload that is not the page's url, title, and visible text. */
export const PAGE_TEXT_UNREADABLE = 'The page text could not be read.'

export function browserAddressError(reason: BrowserURLRejection): string {
  return ADDRESS_ERRORS[reason]
}

export type PageTextResult = { ok: true; page: PageText } | { ok: false; error: string }

export interface OpenPageRead {
  /** False outside the desktop app, where the browser window does not exist. */
  desktop: boolean
  /** False while that window is closed. */
  open: boolean
  /**
   * The address the caller already has for the open page. When it is set, a non-http address
   * is refused before the window is asked.
   */
  url?: string | null
  /** Reads the open page. Tests pass a fixture; the desktop app asks the browser window. */
  read: () => Promise<unknown>
}

/** Cuts the fields the schema limits, so a long page is kept up to the limit. */
function limitPageFields(value: unknown): unknown {
  if (!isPlainObject(value)) return value
  const next: Record<string, unknown> = { ...value }
  if (typeof next.title === 'string') next.title = next.title.slice(0, PAGE_TITLE_LIMIT)
  if (typeof next.text === 'string') next.text = next.text.slice(0, PAGE_TEXT_LIMIT)
  return next
}

/**
 * The open page's URL, title, and visible text. The result is checked on the way out. This
 * function has no document, so it cannot create a layer from what the page returns.
 */
export async function readOpenPageText(input: OpenPageRead): Promise<PageTextResult> {
  if (!input.desktop) return { ok: false, error: BROWSER_DESKTOP_ONLY }
  if (!input.open) return { ok: false, error: BROWSER_WINDOW_CLOSED }
  if (input.url != null && input.url !== '') {
    const known = browserURLPolicy(input.url)
    if (!known.ok) return { ok: false, error: browserAddressError(known.reason) }
  }

  let raw: unknown
  try {
    raw = await input.read()
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : PAGE_TEXT_UNREADABLE }
  }

  const parsed = v.safeParse(pageTextSchema, limitPageFields(raw))
  if (!parsed.success) return { ok: false, error: PAGE_TEXT_UNREADABLE }
  const pageURL = browserURLPolicy(parsed.output.url)
  if (!pageURL.ok) return { ok: false, error: browserAddressError(pageURL.reason) }
  return { ok: true, page: { ...parsed.output, url: pageURL.url } }
}
