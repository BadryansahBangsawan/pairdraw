import {
  ImageTooLargeError,
  MAX_IMAGE_FETCH_BYTES,
  readBoundedImage
} from '@pairdraw/core/figma-api'
import { imageHeader } from '@pairdraw/scene-graph/images'

import type { FetchFunction } from '@/app/http/types'
import { createTauriFetch } from '@/app/tauri/http'
import { IS_TAURI } from '@/constants'

/** Why an image URL gave no image, which the image fill picker words for the person. */
export type ImageURLFailure = 'invalid-url' | 'unreachable' | 'status' | 'too-large' | 'unsupported'

export type ImageURLResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: ImageURLFailure; status?: number }

// On desktop the native proxy fetches past CORS, as `createImageAsync` does for scripts; a
// browser reaches only servers that allow it.
const defaultFetch: FetchFunction = IS_TAURI
  ? createTauriFetch({ maxResponseBytes: MAX_IMAGE_FETCH_BYTES })
  : (input, init) => globalThis.fetch(input, init)

/** The address typed, when it is an absolute HTTP(S) URL or a data URL. */
export function parseImageURL(text: string): URL | null {
  let url: URL
  try {
    // `URL.canParse` is newer than the browser baseline.
    url = new URL(text.trim())
  } catch {
    return null
  }
  return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:'
    ? url
    : null
}

/**
 * The PNG, JPEG, GIF, or WebP at `text`, for an image fill. Data URLs are read here, since the
 * desktop proxy takes only HTTP(S); anything else names why it gave no image, never throwing.
 */
export async function downloadImageURL(
  text: string,
  fetcher: FetchFunction = defaultFetch
): Promise<ImageURLResult> {
  const url = parseImageURL(text)
  if (!url) return { ok: false, reason: 'invalid-url' }
  const load = url.protocol === 'data:' ? globalThis.fetch.bind(globalThis) : fetcher
  let response: Response
  try {
    response = await load(url.href)
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
  if (!response.ok) return { ok: false, reason: 'status', status: response.status }
  let bytes: Uint8Array
  try {
    // Read with the cap applied as it streams, so a body that declares no length, or a false
    // one, stops at the cap instead of filling the tab's memory first.
    bytes = await readBoundedImage(response)
  } catch (error) {
    return { ok: false, reason: error instanceof ImageTooLargeError ? 'too-large' : 'unreachable' }
  }
  const header = imageHeader(bytes)
  if (!header || header.width === 0 || header.height === 0)
    return { ok: false, reason: 'unsupported' }
  return { ok: true, bytes }
}
