import { describe, expect, test } from 'bun:test'

import {
  readWebCaptureClipboard,
  type WebCapture,
  type WebCaptureElement
} from '@pairdraw/web-capture'
import type { CaptureOptions } from '@pairdraw/web-capture/capturer'

import { MAX_PAGE_IMAGE_BYTES, messageBytes, pageCapturePayload } from '../src/payload'

const IMAGE = `data:image/png;base64,${'iVBORw0KGgo'.repeat(400)}`

function image(): WebCaptureElement {
  return { type: 'element', tagName: 'img', attrs: { src: IMAGE }, computedStyle: {}, children: [] }
}

function page(images: boolean): WebCapture {
  return {
    format: 'pairdraw/web-capture',
    version: 1,
    scope: 'page',
    source: { url: 'https://example.com/', title: 'Gallery' },
    capturedAt: '2026-11-03T10:00:00.000Z',
    viewport: { width: 1280, height: 800, devicePixelRatio: 1 },
    root: {
      type: 'element',
      tagName: 'body',
      attrs: {},
      computedStyle: { display: 'block' },
      children: images ? [image(), image()] : [{ type: 'text', text: 'Gallery' }]
    },
    fonts: [],
    truncated: false
  }
}

/** A capturer that records the options it ran with and inlines images unless told not to. */
function capturer() {
  const calls: CaptureOptions[] = []
  const capture = async (options: CaptureOptions) => {
    calls.push(options)
    return page(options.inlineImages !== false)
  }
  return { calls, capture }
}

describe('page capture payload', () => {
  test('caps inlined images so the payload fits in a message to the popup', async () => {
    const { calls, capture } = capturer()
    const payload = await pageCapturePayload(capture, {})

    expect(calls).toEqual([{ maxTotalImageBytes: MAX_PAGE_IMAGE_BYTES }])
    const read = readWebCaptureClipboard(payload.html)
    if (!read?.ok) throw new Error('unreadable payload')
    expect(read.capture.truncated).toBe(false)
  })

  test('captures again without images, marked truncated, when the payload is too large', async () => {
    const { calls, capture } = capturer()
    const small = messageBytes({ ok: true, ...(await pageCapturePayload(capture, {})) }) - 1
    calls.length = 0

    const payload = await pageCapturePayload(capture, {}, small)

    expect(calls.at(1)).toEqual({ inlineImages: false })
    const read = readWebCaptureClipboard(payload.html)
    if (!read?.ok) throw new Error('unreadable payload')
    expect(read.capture.truncated).toBe(true)
    expect(read.capture.root.children).toEqual([{ type: 'text', text: 'Gallery' }])
  })

  test('counts a message in UTF-8 bytes of its JSON', () => {
    expect(messageBytes({ text: 'é' })).toBe('{"text":"é"}'.length + 1)
  })
})
