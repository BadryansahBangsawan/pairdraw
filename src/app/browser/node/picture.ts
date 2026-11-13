import * as v from 'valibot'

import {
  BROWSER_NODE_PRESET_LIMIT,
  BROWSER_NODE_SIZE_LIMIT,
  browserNodeSchema,
  type BrowserNodeRecord
} from '@open-pencil/scene-graph/browser-node'
import { imageSize } from '@open-pencil/scene-graph/images'

import { BROWSER_DESKTOP_ONLY, BROWSER_WINDOW_CLOSED } from '../tools'
import { browserURLPolicy, type BrowserURLRejection } from '../url'
import type { BrowserNodeSession } from './session'

/** The same sentence the screenshot command uses when the window returns no PNG. */
export const BROWSER_NODE_NO_PICTURE = 'The page returned no picture'

/** The picture and the address read after it are not the same page, so nothing is stored. */
export const BROWSER_NODE_ADDRESS_UNCAPTURED =
  'The picture was not of the page that finished loading.'

const URL_ERRORS: Record<BrowserURLRejection, string> = {
  empty: 'Type an address to open.',
  scheme: 'The browser opens http and https addresses only.',
  invalid: 'That address is not a page the browser can open.'
}

/** Why this build cannot take a picture, or null when the window is open on the desktop. */
export function browserNodeGate(session: BrowserNodeSession): string | null {
  if (!session.desktop) return BROWSER_DESKTOP_ONLY
  if (!session.open) return BROWSER_WINDOW_CLOSED
  return null
}

/** The address the window's own policy would open, or the sentence that policy already uses. */
export function browserNodeAddress(
  input: string
): { ok: true; url: string } | { ok: false; error: string } {
  const policy = browserURLPolicy(input)
  if (!policy.ok) return { ok: false, error: URL_ERRORS[policy.reason] }
  return { ok: true, url: policy.url }
}

/**
 * The toolbar preset to store. An empty or over-long id becomes `desktop`. The picture's pixel
 * size is stored separately, because the desktop preset itself has no size.
 */
export function browserNodePreset(preset: string): string {
  const value = preset.trim()
  if (value.length >= 1 && value.length <= BROWSER_NODE_PRESET_LIMIT) return value
  return 'desktop'
}

/**
 * A snapshot record for one PNG. The width and height are the picture's pixels. Bytes that are
 * not a picture, or a picture larger than a snapshot may store, do not become a record.
 */
export function browserNodePicture(
  png: Uint8Array,
  url: string,
  preset: string,
  refreshedAt: string
): { ok: true; record: BrowserNodeRecord; png: Uint8Array } | { ok: false; error: string } {
  const size = png.byteLength < 8 ? null : imageSize(png)
  if (!storedSize(size)) return { ok: false, error: BROWSER_NODE_NO_PICTURE }
  const parsed = v.safeParse(browserNodeSchema, {
    url,
    width: size.width,
    height: size.height,
    preset: browserNodePreset(preset),
    refreshedAt
  })
  if (!parsed.success) return { ok: false, error: BROWSER_NODE_NO_PICTURE }
  return { ok: true, record: parsed.output, png }
}

function storedSize(
  size: { width: number; height: number } | null
): size is { width: number; height: number } {
  if (!size) return false
  return [size.width, size.height].every(
    (side) => Number.isInteger(side) && side >= 1 && side <= BROWSER_NODE_SIZE_LIMIT
  )
}

/** The sentence an action rejected with, or the no-picture sentence when it said nothing. */
export function browserNodeActionError(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : BROWSER_NODE_NO_PICTURE
}
