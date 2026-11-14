import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { encodeWebCaptureClipboard, type WebCapture } from '@pairdraw/web-capture'

import { importBrowserCapture } from '@/app/browser/import'

const CAPTURE: WebCapture = {
  format: 'pairdraw/web-capture',
  version: 1,
  scope: 'page',
  source: { url: 'https://example.com/', title: 'Example' },
  capturedAt: '2026-11-12T00:00:00.000Z',
  viewport: { width: 1024, height: 768, devicePixelRatio: 1 },
  root: {
    type: 'element',
    tagName: 'body',
    attrs: {},
    computedStyle: {
      display: 'block',
      width: '320px',
      height: '80px',
      'background-color': 'rgb(255, 255, 255)'
    },
    children: [
      {
        type: 'element',
        tagName: 'p',
        attrs: {},
        computedStyle: { display: 'block', 'font-size': '16px', color: 'rgb(0, 0, 0)' },
        children: [{ type: 'text', text: 'Hello' }]
      }
    ],
    box: { x: 0, y: 0, width: 320, height: 80 }
  },
  fonts: [],
  truncated: false
}

describe('importing a browser capture', () => {
  test('a captured page becomes layers through the web paste', async () => {
    const editor = createEditor()
    const placed = await importBrowserCapture(editor, encodeWebCaptureClipboard(CAPTURE).html)
    expect(placed).toBe(true)
    expect(editor.graph.getChildren(editor.state.currentPageId).map((node) => node.name)).toEqual([
      'Example'
    ])
  })

  test('a captured element becomes layers through the same paste', async () => {
    const editor = createEditor()
    const element: WebCapture = {
      ...CAPTURE,
      scope: 'element',
      source: { ...CAPTURE.source, title: 'Button' }
    }
    const placed = await importBrowserCapture(editor, encodeWebCaptureClipboard(element).html)
    expect(placed).toBe(true)
    expect(editor.graph.getChildren(editor.state.currentPageId).map((node) => node.name)).toEqual([
      'Button'
    ])
  })

  test('html that is not a capture adds no layers', async () => {
    const editor = createEditor()
    const placed = await importBrowserCapture(editor, '<p>Hello</p>')
    expect(placed).toBe(false)
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
  })
})
