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
    // An inherited object key is not a host, so a prototype name cannot pass as loopback.
    expect(parseEmbedOrigin('http://constructor:3000')).toBeNull()
    expect(parseEmbedOrigin('http://toString:3000')).toBeNull()
  })

  test('accepts a bare VS Code webview origin', () => {
    expect(parseEmbedOrigin('vscode-webview://0b7c5d8e-1f2a-4c3d-9e8f-1a2b3c4d5e6f')).toBe(
      'vscode-webview://0b7c5d8e-1f2a-4c3d-9e8f-1a2b3c4d5e6f'
    )
    for (const refused of [
      'vscode-webview:',
      'vscode-webview://',
      'vscode-webview://uuid/',
      'vscode-webview://uuid/index.html',
      'vscode-webview://uuid?origin=x',
      'vscode-webview://uuid#frag',
      'vscode-webview://user@uuid',
      'vscode-webview://uuid.example'
    ]) {
      expect(parseEmbedOrigin(refused)).toBeNull()
    }
  })

  test('a repeated origin names no host', () => {
    expect(
      parseEmbedParams('?embed&origin=https%3A%2F%2Fa.example&origin=https%3A%2F%2Fb.example')
        ?.origin
    ).toBeNull()
  })
})
