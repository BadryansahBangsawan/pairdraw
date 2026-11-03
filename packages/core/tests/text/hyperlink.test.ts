import { describe, expect, test } from 'bun:test'

import {
  hyperlinkInRange,
  hyperlinkSpanAt,
  hyperlinkSpans,
  isOpenableLinkURL,
  normalizeLinkURL,
  styleRunsWithHyperlink
} from '@open-pencil/core/text'
import { SceneGraph, type HyperlinkTarget, type StyleRun } from '@open-pencil/scene-graph'

/** A script address, which links must refuse; the tests never run it. */
// eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
const SCRIPT_URL = 'javascript:alert(1)'

const SITE: HyperlinkTarget = { type: 'URL', value: 'https://openpencil.dev' }
const MAIL: HyperlinkTarget = { type: 'URL', value: 'mailto:hello@openpencil.dev' }

function textNode(text: string, styleRuns: StyleRun[] = []) {
  const graph = new SceneGraph()
  return graph.createNode('TEXT', graph.getPages()[0].id, { text, styleRuns })
}

describe('normalizeLinkURL', () => {
  test('keeps web and mail addresses as typed', () => {
    expect(normalizeLinkURL('https://openpencil.dev/docs?a=1#b')).toBe(
      'https://openpencil.dev/docs?a=1#b'
    )
    expect(normalizeLinkURL('  http://localhost:1420  ')).toBe('http://localhost:1420')
    expect(normalizeLinkURL('mailto:hello@openpencil.dev')).toBe('mailto:hello@openpencil.dev')
  })

  test('adds the scheme an address was typed without', () => {
    expect(normalizeLinkURL('openpencil.dev')).toBe('https://openpencil.dev')
    expect(normalizeLinkURL('localhost:3000/app')).toBe('https://localhost:3000/app')
    expect(normalizeLinkURL('//openpencil.dev')).toBe('https://openpencil.dev')
    expect(normalizeLinkURL('hello@openpencil.dev')).toBe('mailto:hello@openpencil.dev')
  })

  test('refuses schemes that run code or reach local files', () => {
    for (const typed of [
      SCRIPT_URL,
      SCRIPT_URL.replace('javascript', 'JavaScript'),
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'vbscript:msgbox',
      'tel:+123',
      'ftp://openpencil.dev'
    ]) {
      expect(normalizeLinkURL(typed)).toBeNull()
    }
  })

  test('refuses empty, spaced, and hostless addresses', () => {
    for (const typed of ['', '   ', 'open pencil.dev', 'https://', 'mailto:']) {
      expect(normalizeLinkURL(typed)).toBeNull()
    }
  })
})

test('isOpenableLinkURL opens only web and mail addresses', () => {
  expect(isOpenableLinkURL('https://openpencil.dev')).toBe(true)
  expect(isOpenableLinkURL('mailto:hello@openpencil.dev')).toBe(true)
  expect(isOpenableLinkURL('tel:+123')).toBe(false)
  expect(isOpenableLinkURL(SCRIPT_URL)).toBe(false)
  expect(isOpenableLinkURL('openpencil.dev')).toBe(false)
})

describe('link stretches', () => {
  const node = textNode('Read the docs or mail us', [
    { start: 9, length: 4, style: { hyperlink: SITE, fontWeight: 700 } },
    { start: 13, length: 0, style: { hyperlink: SITE } },
    { start: 17, length: 4, style: { hyperlink: MAIL } }
  ])

  test('list each linked stretch once', () => {
    expect(hyperlinkSpans(node)).toEqual([
      { start: 9, end: 13, link: SITE },
      { start: 17, end: 21, link: MAIL }
    ])
  })

  test('find the stretch a caret stands in or just after', () => {
    expect(hyperlinkSpanAt(node, 10)?.link).toEqual(SITE)
    expect(hyperlinkSpanAt(node, 13)?.link).toEqual(SITE)
    expect(hyperlinkSpanAt(node, 2)).toBeNull()
  })

  test('report one link, none, or a mix for a range', () => {
    expect(hyperlinkInRange(node, 9, 13)).toEqual(SITE)
    expect(hyperlinkInRange(node, 10, 12)).toEqual(SITE)
    expect(hyperlinkInRange(node, 0, 5)).toBeNull()
    expect(hyperlinkInRange(node, 5, 13)).toBe('mixed')
    expect(hyperlinkInRange(node, 9, 21)).toBe('mixed')
  })
})

describe('styleRunsWithHyperlink', () => {
  test('links a range, underlining what did not link before', () => {
    const node = textNode('Hello world')
    expect(styleRunsWithHyperlink(node, 6, 11, SITE, { underline: true })).toEqual([
      { start: 6, length: 5, style: { hyperlink: SITE, textDecoration: 'UNDERLINE' } }
    ])
  })

  test('changes a link without touching its characters other styles', () => {
    const node = textNode('Hello world', [
      { start: 6, length: 5, style: { hyperlink: SITE, fontWeight: 700 } }
    ])
    expect(styleRunsWithHyperlink(node, 6, 11, MAIL, { underline: true })).toEqual([
      { start: 6, length: 5, style: { hyperlink: MAIL, fontWeight: 700 } }
    ])
  })

  test('removes a link and leaves no empty run behind', () => {
    const node = textNode('Hello world', [{ start: 6, length: 5, style: { hyperlink: SITE } }])
    expect(styleRunsWithHyperlink(node, 0, 11, null)).toEqual([])
  })

  test('clamps the range to the text', () => {
    const node = textNode('Hi')
    expect(styleRunsWithHyperlink(node, -3, 40, SITE)).toEqual([
      { start: 0, length: 2, style: { hyperlink: SITE } }
    ])
  })
})
