import * as v from 'valibot'

import {
  BROWSER_NODE_PRESET_LIMIT,
  BROWSER_NODE_SIZE_LIMIT,
  browserNodeSchema,
  type BrowserNodeRecord
} from '@pairdraw/scene-graph/browser-node'
import { imageSize } from '@pairdraw/scene-graph/images'

import { BROWSER_DESKTOP_ONLY, BROWSER_WINDOW_CLOSED } from '../tools'
import { browserURLPolicy, type BrowserURLRejection } from '../url'
import { BROWSER_NODE_FAILURE } from './failure'
import { BROWSER_NODE_LOAD_TIMEOUT } from './load'
import type { BrowserNodeSession } from './session'

/** The same sentence the screenshot command uses when the window returns no PNG. */
export const BROWSER_NODE_NO_PICTURE = 'The page returned no picture'

const URL_ERRORS: Record<BrowserURLRejection, string> = {
  empty: BROWSER_NODE_FAILURE.emptyAddress,
  scheme: BROWSER_NODE_FAILURE.schemeRefused,
  invalid: BROWSER_NODE_FAILURE.invalidAddress
}

/** Why this build cannot take a picture, or null when the window is open on the desktop. */
export function browserNodeGate(session: BrowserNodeSession): string | null {
  if (!session.desktop) return BROWSER_NODE_FAILURE.desktopOnly
  if (!session.open) return BROWSER_NODE_FAILURE.windowClosed
  return null
}

/** The address the window's own policy would open, or the panel code for a refusal. */
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
  if (!storedSize(size)) return { ok: false, error: BROWSER_NODE_FAILURE.noPicture }
  const parsed = v.safeParse(browserNodeSchema, {
    url,
    width: size.width,
    height: size.height,
    preset: browserNodePreset(preset),
    refreshedAt
  })
  if (!parsed.success) return { ok: false, error: BROWSER_NODE_FAILURE.noPicture }
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

const ACTION_CODES: Record<string, string> = {
  [BROWSER_DESKTOP_ONLY]: BROWSER_NODE_FAILURE.desktopOnly,
  [BROWSER_WINDOW_CLOSED]: BROWSER_NODE_FAILURE.windowClosed,
  [BROWSER_NODE_NO_PICTURE]: BROWSER_NODE_FAILURE.noPicture,
  [BROWSER_NODE_LOAD_TIMEOUT]: BROWSER_NODE_FAILURE.loadTimeout
}

/** The panel code for a rejected action. An unknown message is the generic failure. */
export function browserNodeActionError(error: unknown): string {
  if (!(error instanceof Error) || error.message === '') return BROWSER_NODE_FAILURE.noPicture
  return ACTION_CODES[error.message] ?? BROWSER_NODE_FAILURE.failed
}
