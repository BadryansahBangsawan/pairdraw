import {
  encodeWebCaptureClipboard,
  type WebCapture,
  type WebCaptureClipboardPayload
} from '@pairdraw/web-capture'
import type { CaptureOptions } from '@pairdraw/web-capture/capturer'

/**
 * Image bytes a page capture inlines at most. The popup receives the clipboard payload in one
 * message, and the bytes grow by about a third twice on the way: Base64 in the capture's JSON,
 * then Base64 of its compressed form in the clipboard marker.
 */
export const MAX_PAGE_IMAGE_BYTES = 32 * 1024 * 1024

/** Bytes of one message to the popup, below Chrome's 64 MiB limit on extension messages. */
const MAX_MESSAGE_BYTES = 63 * 1024 * 1024

/** The bytes Chrome counts for a message: its JSON in UTF-8. */
export function messageBytes(message: unknown): number {
  return new TextEncoder().encode(JSON.stringify(message)).length
}

type Capture = (options: CaptureOptions) => Promise<WebCapture>

/**
 * The clipboard payload of a page capture, small enough to send to the popup. A payload over
 * `maxBytes` is captured again without inlined images and marked truncated, so the paste says
 * part of the page was left out instead of the copy failing.
 */
export async function pageCapturePayload(
  capture: Capture,
  options: CaptureOptions,
  maxBytes = MAX_MESSAGE_BYTES
): Promise<WebCaptureClipboardPayload> {
  const payload = encodeWebCaptureClipboard(
    await capture({ maxTotalImageBytes: MAX_PAGE_IMAGE_BYTES, ...options })
  )
  if (messageBytes({ ok: true, ...payload }) <= maxBytes) return payload
  const withoutImages = await capture({ ...options, inlineImages: false })
  return encodeWebCaptureClipboard({ ...withoutImages, truncated: true })
}
