import { omit } from 'es-toolkit'

import type { WebCapture, WebCaptureElement } from '@pairdraw/web-capture'

export function element(
  tagName: string,
  computedStyle: Record<string, string> = {},
  children: WebCaptureElement['children'] = [],
  attrs: Record<string, string> = {}
): WebCaptureElement {
  return { type: 'element', tagName, attrs, computedStyle, children }
}

export function capture(root: WebCaptureElement, overrides: Partial<WebCapture> = {}): WebCapture {
  return {
    format: 'pairdraw/web-capture',
    version: 1,
    scope: 'element',
    source: { url: 'https://example.com/pricing/', title: 'Pricing' },
    capturedAt: '2026-11-03T10:00:00.000Z',
    viewport: { width: 1280, height: 800, devicePixelRatio: 2 },
    root,
    fonts: [{ family: 'Inter', weight: '400', style: 'normal' }],
    truncated: false,
    ...overrides
  }
}

/**
 * A capture's JSON with elements nested `depth` deep, written as text, since building it as a
 * value and serializing it would recurse as deep.
 */
export function deepCaptureJSON(depth: number): string {
  const header = omit(capture(element('div')), ['root'])
  const open = '{"type":"element","tagName":"div","attrs":{},"computedStyle":{},"children":['
  const head = JSON.stringify(header).slice(0, -1)
  return `${head},"root":${open.repeat(depth)}${']}'.repeat(depth)}}`
}
