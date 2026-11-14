import { describe, expect, test } from 'bun:test'

import { capture, deepCaptureJSON, element } from '#web-capture-tests/fixtures'

import {
  MAX_CAPTURE_DEPTH,
  MAX_CAPTURE_ELEMENTS,
  parseWebCapture,
  readWebCapture
} from '@pairdraw/web-capture'

/** A script address, which no layer may keep as a link. */
const SCRIPT_URL = ['javascript', 'alert(1)'].join(':')

describe('reading a capture', () => {
  test('reads a capture serialized as JSON', () => {
    const value = capture(element('div', { display: 'block' }, [{ type: 'text', text: 'Hi' }]))
    expect(parseWebCapture(JSON.stringify(value))).toEqual({ ok: true, capture: value })
  })

  test('tells a newer capture from a damaged one', () => {
    const newer = { ...capture(element('div')), version: 2 }
    expect(readWebCapture(newer)).toEqual({ ok: false, error: 'unsupported-version' })
    expect(parseWebCapture('{"format":"pairdraw/web-capture"')).toEqual({
      ok: false,
      error: 'invalid'
    })
    expect(readWebCapture({ ...capture(element('div')), root: { type: 'element' } })).toEqual({
      ok: false,
      error: 'invalid'
    })
  })

  test('keeps only links layers may open, resolved against the page', () => {
    const root = element('div', {}, [
      element('a', {}, [], { href: '/plans' }),
      element('a', {}, [], { href: SCRIPT_URL }),
      element('a', {}, [], { href: 'mailto:sales@example.com' }),
      element('a', {}, [], { href: 'data:text/html,<script>' })
    ])
    const result = readWebCapture(capture(root))
    if (!result.ok) throw new Error(result.error)
    expect(
      result.capture.root.children.map((child) => child.type === 'element' && child.attrs)
    ).toEqual([{ href: 'https://example.com/plans' }, {}, { href: 'mailto:sales@example.com' }, {}])
  })

  test('drops attributes, properties, and elements an import never uses', () => {
    const root = element(
      'div',
      { display: 'flex', cursor: 'pointer', '-webkit-user-select': 'none' },
      [
        element('img', {}, [], { src: 'data:image/png;base64,AAAA', onerror: 'alert(1)' }),
        element('img', {}, [], { src: 'data:image/svg+xml;base64,PHN2Zy8+' }),
        element('script', {}, [{ type: 'text', text: 'alert(1)' }]),
        element('iframe', {}, [], { src: 'https://example.com' })
      ],
      { id: 'hero', style: 'color: red', onclick: 'alert(1)' }
    )
    const result = readWebCapture(capture(root))
    if (!result.ok) throw new Error(result.error)
    const normalized = result.capture.root
    expect(normalized.attrs).toEqual({ id: 'hero' })
    expect(normalized.computedStyle).toEqual({ display: 'flex' })
    expect(normalized.children).toEqual([
      element('img', {}, [], { src: 'data:image/png;base64,AAAA' }),
      element('img')
    ])
  })

  test('stops at the element limit and marks the capture truncated', () => {
    const children = Array.from({ length: MAX_CAPTURE_ELEMENTS + 5 }, () => element('span'))
    const result = readWebCapture(capture(element('div', {}, children)))
    if (!result.ok) throw new Error(result.error)
    expect(result.capture.root.children).toHaveLength(MAX_CAPTURE_ELEMENTS - 1)
    expect(result.capture.truncated).toBe(true)
  })

  test('leaves out elements below the depth limit and marks the capture truncated', () => {
    let root = element('span')
    for (let depth = 0; depth < MAX_CAPTURE_DEPTH + 3; depth++) root = element('div', {}, [root])
    const result = readWebCapture(capture(root))
    if (!result.ok) throw new Error(result.error)
    let levels = 0
    for (let node = result.capture.root.children.at(0); node?.type === 'element'; levels++) {
      node = node.children.at(0)
    }
    expect(levels).toBe(MAX_CAPTURE_DEPTH)
    expect(result.capture.truncated).toBe(true)
  })

  test('refuses a capture nested too deep to validate instead of overflowing the stack', () => {
    const text = deepCaptureJSON(50_000)
    expect(text.length).toBeLessThan(5_000_000)
    expect(parseWebCapture(text)).toEqual({ ok: false, error: 'invalid' })
  })
})
