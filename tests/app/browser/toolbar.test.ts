import { describe, expect, test } from 'bun:test'

import {
  browserAddressRequest,
  browserCaptureFailure,
  browserDeviceRequest,
  browserZoomRequest
} from '@/app/browser/toolbar'

describe('browser toolbar requests', () => {
  test('a browser tab cannot open, zoom, or resize the window', () => {
    expect(browserAddressRequest('https://example.com/', false)).toEqual({
      ok: false,
      reason: 'desktop'
    })
    expect(browserZoomRequest(150, false)).toEqual({ ok: false, reason: 'desktop' })
    expect(browserDeviceRequest('iphone-14', false)).toEqual({ ok: false, reason: 'desktop' })
  })

  test('an address is normalized before it reaches the window', () => {
    expect(browserAddressRequest('example.com', true)).toEqual({
      ok: true,
      value: 'https://example.com/'
    })
    expect(browserAddressRequest('localhost:5173/page', true)).toEqual({
      ok: true,
      value: 'http://localhost:5173/page'
    })
  })

  test('a refused address keeps its reason', () => {
    expect(browserAddressRequest('   ', true).ok).toBe(false)
    expect(browserAddressRequest('file:///etc/passwd', true)).toMatchObject({ reason: 'scheme' })
    const scriptAddress = ['javascript', 'alert(1)'].join(':')
    expect(browserAddressRequest(scriptAddress, true)).toMatchObject({ reason: 'scheme' })
    expect(browserAddressRequest('not a url', true)).toMatchObject({ reason: 'invalid' })
  })

  test('zoom is clamped and an unknown device is the desktop size', () => {
    expect(browserZoomRequest(10, true)).toEqual({ ok: true, value: 25 })
    expect(browserZoomRequest(900, true)).toEqual({ ok: true, value: 400 })
    expect(browserZoomRequest(Number.NaN, true)).toEqual({ ok: true, value: 100 })
    const device = browserDeviceRequest('missing', true)
    expect(device.ok).toBe(true)
    if (device.ok) expect(device.value).toMatchObject({ id: 'desktop', width: 0, height: 0 })
    const phone = browserDeviceRequest('iphone-14', true)
    if (phone.ok) expect(phone.value).toMatchObject({ width: 390, height: 844 })
  })

  test('a cancelled element pick is not a failed capture', () => {
    expect(browserCaptureFailure(new Error('The pick was cancelled'))).toEqual({ cancelled: true })
    expect(browserCaptureFailure('The pick was cancelled')).toEqual({ cancelled: true })
    expect(browserCaptureFailure(new Error('The browser window is not open'))).toEqual({
      cancelled: false,
      detail: 'The browser window is not open'
    })
    expect(browserCaptureFailure(new Error('The pick timed out'))).toEqual({
      cancelled: false,
      detail: 'The pick timed out'
    })
  })
})
