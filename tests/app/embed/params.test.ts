import { describe, expect, test } from 'bun:test'

import { parseEmbedOrigin, parseEmbedParams } from '@/app/embed/params'

describe('embed params', () => {
  test('outside embed mode there are none', () => {
    expect(parseEmbedParams('?origin=https%3A%2F%2Fhost.example')).toBeNull()
  })

  test('an embed is read-only and chrome-less unless its URL asks otherwise', () => {
    expect(parseEmbedParams('?embed&origin=https%3A%2F%2Fhost.example')).toEqual({
      origin: 'https://host.example',
      allowEdit: false,
      chrome: false
    })
    expect(parseEmbedParams('?embed&origin=https%3A%2F%2Fhost.example&allow-edit&chrome')).toEqual({
      origin: 'https://host.example',
      allowEdit: true,
      chrome: true
    })
  })

  test('accepts only one serialized origin, exactly as a message event reports it', () => {
    expect(parseEmbedOrigin('https://host.example')).toBe('https://host.example')
    expect(parseEmbedOrigin('https://host.example:8443')).toBe('https://host.example:8443')
    for (const refused of [
      null,
      '',
      '*',
      'null',
      'https://host.example/',
      'https://host.example/page',
      'https://*.host.example',
      'https://user@host.example',
      'HTTPS://HOST.EXAMPLE',
      'https://host.example:443',
      // eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
      'javascript:alert(1)',
      'file:///etc/passwd',
      'host.example'
    ]) {
      expect(parseEmbedOrigin(refused)).toBeNull()
    }
  })

  test('plain http is accepted only on loopback', () => {
    expect(parseEmbedOrigin('http://localhost:5173')).toBe('http://localhost:5173')
    expect(parseEmbedOrigin('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000')
    expect(parseEmbedOrigin('http://[::1]:3000')).toBe('http://[::1]:3000')
    expect(parseEmbedOrigin('http://host.example')).toBeNull()
  })

  test('a repeated origin names no host', () => {
    expect(
      parseEmbedParams('?embed&origin=https%3A%2F%2Fa.example&origin=https%3A%2F%2Fb.example')
        ?.origin
    ).toBeNull()
  })
})
