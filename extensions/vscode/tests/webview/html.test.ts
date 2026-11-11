import { describe, expect, test } from 'bun:test'

import { DEFAULT_EDITOR_URL, embedWebviewHtml, parseEditorUrl } from '../../src/webview/html'

const NONCE = 'abc123'
const SCRIPT_URI = 'vscode-webview-resource://abc/dist/webview.js'
const CSP_SOURCE = 'vscode-webview-resource://abc'

function render(editorUrl = DEFAULT_EDITOR_URL): string {
  return embedWebviewHtml({ cspSource: CSP_SOURCE, scriptUri: SCRIPT_URI, editorUrl, nonce: NONCE })
}

describe('webview page', () => {
  test('frames exactly the configured editor and nothing else', () => {
    const html = render()
    expect(html).toContain('frame-src http://localhost:1420')
    expect(html).toContain('connect-src http://localhost:1420')
    expect(html).toContain(`script-src 'nonce-${NONCE}'`)
    expect(html).toContain(`src="${SCRIPT_URI}"`)
    expect(html).toContain('allow="clipboard-read; clipboard-write"')
  })

  test('escapes the configured URL into an attribute', () => {
    const html = render('https://editor.example/?a=1&b="2"')
    expect(html).toContain('data-editor-url="https://editor.example/?a=1&amp;b=&quot;2&quot;"')
  })

  test('refuses a URL the extension would not frame', () => {
    for (const refused of [
      'http://remote.example',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'vscode-webview://abc',
      'not a url'
    ]) {
      expect(() => render(refused)).toThrow('not an http(s) URL')
    }
  })

  test('accepts https anywhere and http only on loopback', () => {
    expect(parseEditorUrl('https://editor.example/sub')?.origin).toBe('https://editor.example')
    expect(parseEditorUrl('http://localhost:1420')?.origin).toBe('http://localhost:1420')
    expect(parseEditorUrl('http://127.0.0.1:1420')?.origin).toBe('http://127.0.0.1:1420')
    expect(parseEditorUrl('http://[::1]:1420')?.origin).toBe('http://[::1]:1420')
    expect(parseEditorUrl('http://192.168.1.2:1420')).toBeNull()
  })
})