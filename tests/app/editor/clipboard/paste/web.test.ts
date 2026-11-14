import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { omit } from 'es-toolkit'
import { deflateSync, strToU8 } from 'fflate'
import { Window } from 'happy-dom'
import { fromUint8Array } from 'js-base64'

import type { DesignDocument } from '@pairdraw/dom-css'
import { filesMessages } from '@pairdraw/vue/i18n'
import {
  WEB_CAPTURE_CLIPBOARD_END,
  WEB_CAPTURE_CLIPBOARD_START,
  encodeWebCaptureClipboard,
  type WebCapture
} from '@pairdraw/web-capture'

import { pasteClipboardHTML } from '@/app/editor/clipboard/paste/content'
import { pasteWebClipboardHTML } from '@/app/editor/clipboard/paste/web'
import { createBrowserSystemClipboard } from '@/app/editor/clipboard/system/browser'
import { createEditorStore } from '@/app/editor/session/create'
import { toast } from '@/app/shell/ui'

const CAPTURE: WebCapture = {
  format: 'pairdraw/web-capture',
  version: 1,
  scope: 'element',
  source: { url: 'https://example.com/pricing/', title: 'Pricing' },
  capturedAt: '2026-11-03T10:00:00.000Z',
  viewport: { width: 1280, height: 800, devicePixelRatio: 1 },
  root: {
    type: 'element',
    tagName: 'section',
    attrs: { class: 'plan' },
    computedStyle: { display: 'block', 'background-color': 'rgb(255, 0, 0)' },
    box: { x: 0, y: 0, width: 240, height: 120 },
    children: [{ type: 'text', text: 'Pro plan' }]
  },
  fonts: [],
  truncated: false
}

const STYLED: DesignDocument = {
  type: 'document',
  children: [
    {
      type: 'element',
      tagName: 'p',
      attrs: {},
      computedStyle: { display: 'block', width: '100px', height: '20px' },
      children: [{ type: 'text', text: 'Hello' }]
    }
  ]
}

function topLevelNames(store: ReturnType<typeof createEditorStore>): string[] {
  return store.graph.getChildren(store.state.currentPageId).map((node) => node.name)
}

describe('pasting web content', () => {
  test('pastes a web capture as layers named after the page, in one undo step', async () => {
    const store = createEditorStore()
    const { html } = encodeWebCaptureClipboard(CAPTURE)

    expect(await pasteWebClipboardHTML(store, html)).toBe(true)

    expect(topLevelNames(store)).toEqual(['Pricing'])
    const [section] = store.graph.getChildren(store.state.currentPageId)
    expect(section).toMatchObject({ type: 'FRAME', width: 240, height: 120 })
    store.undoAction()
    expect(topLevelNames(store)).toEqual([])
  })

  test('routes a capture from the clipboard through the ordinary paste', async () => {
    const store = createEditorStore()
    const { html, text } = encodeWebCaptureClipboard(CAPTURE)
    const clipboard = createBrowserSystemClipboard({
      write: async () => true,
      read: async () => ({ available: true, html, text })
    })

    expect(await clipboard.paste(store)).toBe(true)
    expect(topLevelNames(store)).toEqual(['Pricing'])

    // A frame selected takes the paste inside it, as in Figma.
    store.clearSelection()
    await pasteClipboardHTML(store, html)
    expect(topLevelNames(store)).toEqual(['Pricing', 'Pricing'])
  })

  test('reports a damaged capture without pasting anything', async () => {
    const store = createEditorStore()
    const error = mock((_message: string) => 0)
    const original = toast.error
    toast.error = error
    try {
      const html = `${WEB_CAPTURE_CLIPBOARD_START}AAAA${WEB_CAPTURE_CLIPBOARD_END}`
      expect(await pasteWebClipboardHTML(store, html)).toBe(true)
    } finally {
      toast.error = original
    }
    expect(error).toHaveBeenCalledWith(filesMessages.get().webCaptureUnreadable)
    expect(topLevelNames(store)).toEqual([])
  })

  test('reports a capture nested too deep to read without pasting anything', async () => {
    const store = createEditorStore()
    const error = mock((_message: string) => 0)
    const original = toast.error
    toast.error = error
    // Written as text: a value this deep would overflow the stack serializing it.
    const open = '{"type":"element","tagName":"div","attrs":{},"computedStyle":{},"children":['
    const header = omit(CAPTURE, ['root'])
    const json = `${JSON.stringify(header).slice(0, -1)},"root":${open.repeat(50_000)}${']}'.repeat(50_000)}}`
    const payload = fromUint8Array(deflateSync(strToU8(json)))
    try {
      const html = `${WEB_CAPTURE_CLIPBOARD_START}${payload}${WEB_CAPTURE_CLIPBOARD_END}`
      expect(await pasteWebClipboardHTML(store, html)).toBe(true)
    } finally {
      toast.error = original
    }
    expect(error).toHaveBeenCalledWith(filesMessages.get().webCaptureUnreadable)
    expect(topLevelNames(store)).toEqual([])
  })

  describe('plain web HTML', () => {
    const window = new Window({ url: 'https://pairdraw.test/' })
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser')
    beforeEach(() => {
      Object.defineProperty(globalThis, 'DOMParser', {
        value: window.DOMParser,
        configurable: true,
        writable: true
      })
    })
    afterEach(() => {
      if (descriptor) Object.defineProperty(globalThis, 'DOMParser', descriptor)
      else Reflect.deleteProperty(globalThis, 'DOMParser')
    })

    test('styles the sanitized fragment and pastes it as layers', async () => {
      const store = createEditorStore()
      const style = mock(async (_html: string) => STYLED)

      const pasted = await pasteWebClipboardHTML(
        store,
        '<meta charset="utf-8"><p onclick="steal()">Hello</p><script>steal()</script>',
        undefined,
        style
      )

      expect(pasted).toBe(true)
      expect(style).toHaveBeenCalledWith('<p>Hello</p>', {})
      expect(store.graph.getChildren(store.state.currentPageId).map((node) => node.type)).toEqual([
        'FRAME'
      ])
    })

    test('leaves HTML that draws nothing to other paste handlers', async () => {
      const store = createEditorStore()
      const style = mock(async (_html: string) => STYLED)

      expect(await pasteWebClipboardHTML(store, '<meta charset="utf-8"> ', undefined, style)).toBe(
        false
      )
      expect(style).not.toHaveBeenCalled()
    })
  })
})
