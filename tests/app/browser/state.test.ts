import { describe, expect, test } from 'bun:test'

import {
  browserState,
  currentDevice,
  markClosed,
  markLoadFailed,
  markNavigating,
  markPageLoaded,
  normalizeZoom,
  setDevice,
  setZoom
} from '@/app/browser/state'
import { browserURLPolicy } from '@/app/browser/url'

describe('browser session state', () => {
  test('a navigation opens the session and reports progress until the page arrives', () => {
    markNavigating('https://example.com/')
    expect(browserState.open).toBe(true)
    expect(browserState.url).toBe('https://example.com/')
    expect(browserState.loading).toBe(true)

    markPageLoaded({ url: 'https://example.com/final', title: 'Example' })
    expect(browserState.loading).toBe(false)
    expect(browserState.url).toBe('https://example.com/final')
    expect(browserState.title).toBe('Example')
    markClosed()
  })

  test('a failure stops progress and keeps the address that was asked for', () => {
    markNavigating('https://example.com/')
    markLoadFailed()
    expect(browserState.loading).toBe(false)
    expect(browserState.url).toBe('https://example.com/')
    markClosed()
  })

  test('a refused navigation changes nothing', () => {
    markClosed()
    expect(browserURLPolicy(['javascript', 'alert(1)'].join(':')).ok).toBe(false)
    expect(browserState.open).toBe(false)
    expect(browserURLPolicy('example.com')).toEqual({ ok: true, url: 'https://example.com/' })
  })

  test('zoom is clamped to the offered range', () => {
    expect(normalizeZoom(10)).toBe(25)
    expect(normalizeZoom(1000)).toBe(400)
    expect(normalizeZoom(133.7)).toBe(134)
    expect(normalizeZoom(Number.NaN)).toBe(100)
    setZoom(50)
    expect(browserState.zoom).toBe(50)
    markClosed()
  })

  test('an unknown device preset falls back to desktop', () => {
    setDevice('iphone-14')
    expect(currentDevice()).toMatchObject({ id: 'iphone-14', width: 390 })
    setDevice('watch')
    expect(currentDevice().id).toBe('desktop')
  })

  test('closing forgets the page entirely', () => {
    markNavigating('https://example.com/')
    markPageLoaded({ url: 'https://example.com/', title: 'x' })
    markClosed()
    expect(browserState).toMatchObject({ open: false, url: null, title: '', loading: false })
  })
})
