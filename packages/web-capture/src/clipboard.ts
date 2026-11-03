import { compact } from 'es-toolkit'
import { Inflate, deflateSync, strToU8 } from 'fflate'
import { fromUint8Array, isValid, toUint8Array } from 'js-base64'

import type { WebCapture, WebCaptureReadResult } from './format'
import { webCaptureToHTML } from './html'
import { MAX_CAPTURE_JSON_LENGTH } from './limits'
import { normalizeWebCapture, parseWebCapture } from './parse'

/**
 * Clipboard HTML carries a capture between these markers, as Base64 of the DEFLATE-compressed
 * JSON, the way Figma and OpenPencil carry their layers in an HTML comment.
 */
export const WEB_CAPTURE_CLIPBOARD_START = '<!--(openpencil-web-capture)'
export const WEB_CAPTURE_CLIPBOARD_END = '(/openpencil-web-capture)-->'

/** Compressed bytes inflated per step, so an oversized payload stops early. */
const INFLATE_STEP = 16 * 1024

export interface WebCaptureClipboardPayload {
  /** The capture in markers, followed by its content as styled HTML for other applications. */
  html: string
  /** The page's title and address, for applications that only read text. */
  text: string
}

/** What the clipboard holds after copying a capture: the capture itself and a readable copy. */
export function encodeWebCaptureClipboard(captured: WebCapture): WebCaptureClipboardPayload {
  const capture = normalizeWebCapture(captured)
  const compressed = deflateSync(strToU8(JSON.stringify(capture)), { level: 6 })
  const marker = `${WEB_CAPTURE_CLIPBOARD_START}${fromUint8Array(compressed)}${WEB_CAPTURE_CLIPBOARD_END}`
  const html = `<meta charset="utf-8">${marker}${webCaptureToHTML(capture, { images: false })}`
  const text = compact([capture.source.title, capture.source.url]).join('\n')
  return { html, text }
}

function markedPayload(html: string): string | null {
  const start = html.indexOf(WEB_CAPTURE_CLIPBOARD_START)
  if (start === -1) return null
  const from = start + WEB_CAPTURE_CLIPBOARD_START.length
  const end = html.indexOf(WEB_CAPTURE_CLIPBOARD_END, from)
  return end === -1 ? null : html.slice(from, end)
}

/** Whether clipboard HTML holds a complete capture marker. */
export function hasWebCaptureClipboardMarker(html: string): boolean {
  return markedPayload(html) !== null
}

/** Inflates at most `MAX_CAPTURE_JSON_LENGTH` bytes of text. */
function inflateText(bytes: Uint8Array): { text: string } | 'invalid' | 'too-large' {
  const decoder = new TextDecoder()
  // An object, since the inflate callback changes it where control flow analysis cannot see.
  const state = { text: '', length: 0, overflow: false }
  const inflate = new Inflate((chunk) => {
    state.length += chunk.length
    if (state.length > MAX_CAPTURE_JSON_LENGTH) state.overflow = true
    else state.text += decoder.decode(chunk, { stream: true })
  })
  try {
    for (let offset = 0; offset < bytes.length; offset += INFLATE_STEP) {
      if (state.overflow) break
      const end = offset + INFLATE_STEP
      inflate.push(bytes.subarray(offset, end), end >= bytes.length)
    }
  } catch {
    return 'invalid'
  }
  return state.overflow ? 'too-large' : { text: state.text + decoder.decode() }
}

/**
 * The capture clipboard HTML holds, or null when it holds none. Clipboard HTML is writable by
 * any page, so the payload is size-limited, validated, and normalized before it is returned.
 */
export function readWebCaptureClipboard(html: string): WebCaptureReadResult | null {
  const payload = markedPayload(html)
  if (payload === null) return null
  const encoded = payload.trim()
  if (encoded.length > MAX_CAPTURE_JSON_LENGTH) return { ok: false, error: 'too-large' }
  if (!isValid(encoded)) return { ok: false, error: 'invalid' }
  const inflated = inflateText(toUint8Array(encoded))
  if (typeof inflated === 'string') return { ok: false, error: inflated }
  return parseWebCapture(inflated.text)
}
