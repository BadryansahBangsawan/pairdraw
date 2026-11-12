import { describe, expect, test } from 'bun:test'

import { browserDisplayURL, browserURLPolicy } from '@/app/browser/url'

const SCRIPT_URL = ['javascript', 'alert(1)'].join(':')

describe('browser URL policy', () => {
  test('opens http and https, localhost and ports included', () => {
    expect(browserURLPolicy('https://example.com/a?b=c')).toEqual({
      ok: true,
      url: 'https://example.com/a?b=c'
    })
    expect(browserURLPolicy('http://localhost:3000')).toEqual({
      ok: true,
      url: 'http://localhost:3000/'
    })
    expect(browserURLPolicy('https://127.0.0.1:5173/x')).toEqual({
      ok: true,
      url: 'https://127.0.0.1:5173/x'
    })
  })

  test('a typed host gets a scheme: https, or http on loopback', () => {
    expect(browserURLPolicy('example.com')).toEqual({ ok: true, url: 'https://example.com/' })
    expect(browserURLPolicy('example.com:8080/docs')).toEqual({
      ok: true,
      url: 'https://example.com:8080/docs'
    })
    expect(browserURLPolicy('localhost:3000')).toEqual({ ok: true, url: 'http://localhost:3000/' })
  })

  test('refuses every other scheme with the reason', () => {
    for (const input of [
      'file:///etc/passwd',
      'data:text/html,<h1>x</h1>',
      SCRIPT_URL,
      'blob:https://example.com/abc',
      'chrome://settings',
      'vscode://file/tmp/x'
    ]) {
      expect(browserURLPolicy(input)).toEqual({ ok: false, reason: 'scheme', input })
    }
  })

  test('refuses nothing and a non-URL', () => {
    expect(browserURLPolicy('   ')).toEqual({ ok: false, reason: 'empty', input: '   ' })
    expect(browserURLPolicy('not a url')).toEqual({
      ok: false,
      reason: 'invalid',
      input: 'not a url'
    })
  })

  test('a scheme without slashes still resolves to the page it names', () => {
    expect(browserURLPolicy('http:example.com')).toEqual({ ok: true, url: 'http://example.com/' })
  })

  test('shows the URL it will load without the fragment', () => {
    expect(browserDisplayURL('https://example.com/a#section')).toBe('https://example.com/a')
    expect(browserDisplayURL('not a url')).toBe('not a url')
  })
})
