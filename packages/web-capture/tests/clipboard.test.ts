import { describe, expect, test } from 'bun:test'

import { capture, deepCaptureJSON, element } from '#web-capture-tests/fixtures'
import { deflateSync, strToU8 } from 'fflate'
import { fromUint8Array } from 'js-base64'

import {
  WEB_CAPTURE_CLIPBOARD_END,
  WEB_CAPTURE_CLIPBOARD_START,
  encodeWebCaptureClipboard,
  hasWebCaptureClipboardMarker,
  readWebCaptureClipboard
} from '@open-pencil/web-capture'

const CARD = capture(
  element('div', { display: 'block', 'background-color': 'rgb(255, 255, 255)' }, [
    element('h1', { 'font-size': '32px' }, [{ type: 'text', text: 'Plans & <prices>' }]),
    element('img', {}, [], { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'Logo' })
  ])
)

describe('capture clipboard payload', () => {
  test('round-trips the capture through clipboard HTML', () => {
    const { html, text } = encodeWebCaptureClipboard(CARD)
    expect(hasWebCaptureClipboardMarker(html)).toBe(true)
    expect(readWebCaptureClipboard(html)).toEqual({ ok: true, capture: CARD })
    expect(text).toBe('Pricing\nhttps://example.com/pricing/')
  })

  test('follows the marker with readable HTML for other applications, without images', () => {
    const { html } = encodeWebCaptureClipboard(CARD)
    const readable = html.slice(html.indexOf(WEB_CAPTURE_CLIPBOARD_END))
    expect(readable).toContain('<h1 style="font-size: 32px">Plans &amp; &lt;prices&gt;</h1>')
    expect(readable).toContain('<img alt="Logo">')
  })

  test('reads nothing from HTML without a capture', () => {
    expect(readWebCaptureClipboard('<p>Hello</p>')).toBeNull()
    expect(hasWebCaptureClipboardMarker(`${WEB_CAPTURE_CLIPBOARD_START}abc`)).toBe(false)
  })

  test('reports damaged payloads instead of throwing', () => {
    const wrap = (payload: string) =>
      `${WEB_CAPTURE_CLIPBOARD_START}${payload}${WEB_CAPTURE_CLIPBOARD_END}`
    expect(readWebCaptureClipboard(wrap('not base64!'))).toEqual({ ok: false, error: 'invalid' })
    expect(readWebCaptureClipboard(wrap('AAAA'))).toEqual({ ok: false, error: 'invalid' })
  })

  test('reports a small payload nested too deep to validate instead of throwing', () => {
    const payload = fromUint8Array(deflateSync(strToU8(deepCaptureJSON(50_000)), { level: 9 }))
    expect(payload.length).toBeLessThan(64 * 1024)
    const html = `${WEB_CAPTURE_CLIPBOARD_START}${payload}${WEB_CAPTURE_CLIPBOARD_END}`
    expect(readWebCaptureClipboard(html)).toEqual({ ok: false, error: 'invalid' })
  })
})
