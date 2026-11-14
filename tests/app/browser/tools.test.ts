import { describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { createEditor } from '@pairdraw/core'
import { encodeWebCaptureClipboard, type WebCapture } from '@pairdraw/web-capture'

import { BROWSER_ELEMENT_TEXT_LIMIT } from '@/app/browser/read'
import {
  BROWSER_DESKTOP_ONLY,
  BROWSER_SELECTOR_TOO_LONG,
  BROWSER_SHOT_KIND,
  BROWSER_WINDOW_CLOSED,
  browserToolCall,
  runBrowserTool,
  type BrowserToolActions
} from '@/app/browser/tools'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)

const CAPTURE: WebCapture = {
  format: 'pairdraw/web-capture',
  version: 1,
  scope: 'element',
  source: { url: 'https://example.com/', title: 'Button' },
  capturedAt: '2026-11-12T00:00:00.000Z',
  viewport: { width: 1024, height: 768, devicePixelRatio: 1 },
  root: {
    type: 'element',
    tagName: 'button',
    attrs: {},
    computedStyle: { display: 'block', width: '80px', height: '32px' },
    children: [{ type: 'text', text: 'Go' }],
    box: { x: 0, y: 0, width: 80, height: 32 }
  },
  fonts: [],
  truncated: false
}

function actions(over: Partial<BrowserToolActions> = {}): BrowserToolActions {
  return {
    navigate: () => Promise.reject(new Error('navigate')),
    screenshot: () => Promise.reject(new Error('screenshot')),
    captureElement: () => Promise.reject(new Error('capture')),
    readElement: () => Promise.reject(new Error('read')),
    readOutline: () => Promise.reject(new Error('outline')),
    ...over
  }
}

describe('browser tool calls', () => {
  test('a closed window is an error, including a load, and the address is not opened', () => {
    const closed = browserToolCall('browser_load_page', { url: 'https://example.com' }, true, false)
    expect(closed).toEqual({ ok: false, error: BROWSER_WINDOW_CLOSED })
    const shot = browserToolCall('browser_screenshot', { kind: 'visible' }, true, false)
    expect(shot).toEqual({ ok: false, error: BROWSER_WINDOW_CLOSED })
  })

  test('a browser build refuses before the address is checked', () => {
    const decided = browserToolCall('browser_element', {}, false, true)
    expect(decided).toEqual({ ok: false, error: BROWSER_DESKTOP_ONLY })
  })

  test('a load normalizes a bare host and refuses other schemes', () => {
    expect(browserToolCall('browser_load_page', { url: 'example.com' }, true, true)).toEqual({
      ok: true,
      call: { command: 'browser_load_page', url: 'https://example.com/' }
    })
    expect(browserToolCall('browser_load_page', { url: 'file:///etc/passwd' }, true, true)).toEqual(
      {
        ok: false,
        error: 'The browser opens http and https addresses only.'
      }
    )
    const scriptAddress = ['javascript', 'alert(1)'].join(':')
    expect(browserToolCall('browser_load_page', { url: scriptAddress }, true, true)).toEqual({
      ok: false,
      error: 'The browser opens http and https addresses only.'
    })
    expect(browserToolCall('browser_load_page', { url: '' }, true, true)).toEqual({
      ok: false,
      error: 'Type an address to open.'
    })
  })

  test('a screenshot is the view, the page, or an element', () => {
    expect(browserToolCall('browser_screenshot', { kind: 'cdp' }, true, true)).toEqual({
      ok: false,
      error: BROWSER_SHOT_KIND
    })
    expect(browserToolCall('browser_screenshot_to_canvas', { kind: 'full' }, true, true)).toEqual({
      ok: true,
      call: { command: 'browser_screenshot_to_canvas', kind: 'full' }
    })
  })
})

describe('running an accepted browser tool', () => {
  test('a load navigates the open window and does not capture it', async () => {
    let loaded = ''
    const result = await runBrowserTool(
      createEditor(),
      { command: 'browser_load_page', url: 'https://example.com/' },
      actions({
        navigate: (url) => {
          loaded = url
          return Promise.resolve()
        }
      })
    )
    expect(loaded).toBe('https://example.com/')
    expect(result).toEqual({ loaded: true, url: 'https://example.com/' })
  })

  test('a screenshot comes back as a png', async () => {
    const result = await runBrowserTool(
      createEditor(),
      { command: 'browser_screenshot', kind: 'visible' },
      actions({ screenshot: () => Promise.resolve(PNG) })
    )
    expect(result.mimeType).toBe('image/png')
    const bytes = toUint8Array(String(result.base64))
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  test('an element capture becomes layers through the web paste', async () => {
    const editor = createEditor()
    const result = await runBrowserTool(
      editor,
      { command: 'browser_element' },
      actions({
        captureElement: () => Promise.resolve(encodeWebCaptureClipboard(CAPTURE).html)
      })
    )
    expect(result).toEqual({ imported: true })
    expect(editor.graph.getChildren(editor.state.currentPageId).map((node) => node.name)).toEqual([
      'Button'
    ])
  })

  test('html that is not a capture adds no layers', async () => {
    const editor = createEditor()
    await expect(
      runBrowserTool(
        editor,
        { command: 'browser_element' },
        actions({ captureElement: () => Promise.resolve('<p>Hello</p>') })
      )
    ).rejects.toThrow('The page returned no capture')
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })

  test('a cancelled pick adds nothing', async () => {
    const editor = createEditor()
    await expect(
      runBrowserTool(
        editor,
        { command: 'browser_element' },
        actions({
          captureElement: () => Promise.reject(new Error('The pick was cancelled'))
        })
      )
    ).rejects.toThrow('The pick was cancelled')
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })

  test('a canvas screenshot is placed with the image paste', async () => {
    const files: File[] = []
    const result = await runBrowserTool(
      {
        pasteStyledDocument: () => Promise.resolve([]),
        placeImageFiles: (accepted) => {
          files.push(...accepted)
          return Promise.resolve()
        }
      },
      { command: 'browser_screenshot_to_canvas', kind: 'element' },
      actions({ screenshot: () => Promise.resolve(PNG) })
    )
    expect(result).toEqual({ placed: true })
    expect(files.map((file) => file.name)).toEqual(['Element.png'])
  })

  test('a reading that is not the schema adds no layers', async () => {
    const editor = createEditor()
    await expect(
      runBrowserTool(
        editor,
        { command: 'browser_read_element', selector: 'img' },
        actions({
          readElement: () => Promise.resolve('{"html":"<img src=x onerror=alert(1)>"}')
        })
      )
    ).rejects.toThrow('The page returned nothing we can read.')
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })

  test('element text longer than the limit is cut, and the reply stays text', async () => {
    const editor = createEditor()
    const result = await runBrowserTool(
      editor,
      { command: 'browser_read_element', selector: 'p' },
      actions({
        readElement: () =>
          Promise.resolve(
            JSON.stringify({
              tag: 'p',
              role: 'paragraph',
              text: `  ${'A'.repeat(BROWSER_ELEMENT_TEXT_LIMIT + 40)}  `,
              box: { x: 1, y: 2, width: 3, height: 4 }
            })
          )
      })
    )
    expect(result.untrustedPageText).toBe(true)
    expect(result.text).toBe('A'.repeat(BROWSER_ELEMENT_TEXT_LIMIT))
    expect(result).not.toHaveProperty('html')
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })

  test('a read needs a selector, and a browser build never asks the page', () => {
    expect(browserToolCall('browser_read_element', { selector: '' }, true, true)).toEqual({
      ok: false,
      error: 'The element is not on the page'
    })
    expect(
      browserToolCall('browser_read_element', { selector: 'p'.repeat(501) }, true, true)
    ).toEqual({ ok: false, error: BROWSER_SELECTOR_TOO_LONG })
    expect(browserToolCall('browser_read_outline', {}, false, true)).toEqual({
      ok: false,
      error: BROWSER_DESKTOP_ONLY
    })
    expect(browserToolCall('browser_read_element', { selector: 'h1' }, true, false)).toEqual({
      ok: false,
      error: BROWSER_WINDOW_CLOSED
    })
  })
})
