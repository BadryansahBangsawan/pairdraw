import { fromUint8Array } from 'js-base64'
import * as v from 'valibot'

import { MAX_CAPTURE_IMAGE_BYTES } from '@pairdraw/web-capture'

import type { ImageResponse } from './messages'
import { imageRequestSchema } from './schema'

/**
 * Fetches an image for the capture script. It reads another site only with the optional host
 * permission the person granted; without it the fetch is a CORS request like the page's own.
 */
async function fetchImage(url: string): Promise<ImageResponse> {
  const { protocol } = new URL(url)
  if (protocol !== 'https:' && protocol !== 'http:') return { ok: false }
  try {
    const response = await fetch(url, { credentials: 'omit' })
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    if (!response.ok || !type.startsWith('image/')) return { ok: false }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length > MAX_CAPTURE_IMAGE_BYTES) return { ok: false }
    return { ok: true, dataURL: `data:${type};base64,${fromUint8Array(bytes)}` }
  } catch {
    return { ok: false }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only this extension's own capture script may ask.
  if (sender.id !== chrome.runtime.id || !sender.tab) return undefined
  const request = v.safeParse(imageRequestSchema, message)
  if (!request.success) return undefined
  void fetchImage(request.output.url).then(sendResponse)
  return true
})
