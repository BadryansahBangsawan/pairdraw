import { describe, expect, test } from 'bun:test'

import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'
import { runTool, setupToolTest } from '#core-tests/helpers/tools'

import { hyperlinkSpans } from '@pairdraw/core/text'

/** Script addresses, which links must refuse; the tests never run them. */
// eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
const SCRIPT_URL = 'javascript:alert(1)'
// eslint-disable-next-line no-script-url -- Rejection fixture; this URL is never executed.
const SHORT_SCRIPT_URL = 'javascript:1'

function setup() {
  const { graph, figma } = setupToolTest()
  const page = expectDefined(graph.getPages()[0], 'page')
  const text = graph.createNode('TEXT', page.id, {
    name: 'Footer',
    width: 200,
    height: 20,
    text: 'Read the docs today',
    textAlignHorizontal: 'LEFT'
  })
  return { graph, figma, text }
}

describe('set_text_properties hyperlink', () => {
  test('links the whole text, adding the scheme a typed address lacks', async () => {
    const { graph, figma, text } = setup()
    const result = await runTool(figma, 'set_text_properties', {
      id: text.id,
      hyperlink: 'Example.com/docs'
    })
    expect(result).toEqual({ id: text.id, updated: ['hyperlink'] })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))).toEqual([
      { start: 0, end: 19, link: { type: 'URL', value: 'https://Example.com/docs' } }
    ])
  })

  test('takes mail addresses and removes a link with null or ""', async () => {
    const { graph, figma, text } = setup()
    await runTool(figma, 'set_text_properties', { id: text.id, hyperlink: 'hi@example.com' })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))[0]?.link.value).toBe(
      'mailto:hi@example.com'
    )
    await runTool(figma, 'set_text_properties', { id: text.id, hyperlink: null })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))).toEqual([])
    await runTool(figma, 'set_text_properties', { id: text.id, hyperlink: 'HTTPS://a.com' })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))[0]?.link.value).toBe('https://a.com')
    await runTool(figma, 'set_text_properties', { id: text.id, hyperlink: '' })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))).toEqual([])
  })

  test('refuses a script address before changing anything', async () => {
    const { graph, figma, text } = setup()
    const result = await runTool(figma, 'set_text_properties', {
      id: text.id,
      align_horizontal: 'CENTER',
      hyperlink: SCRIPT_URL
    })
    expect(result).toEqual({ error: expect.stringContaining('not a link the editor opens') })
    const node = getNodeOrThrow(graph, text.id)
    expect(node.textAlignHorizontal).toBe('LEFT')
    expect(hyperlinkSpans(node)).toEqual([])
  })

  test('writes a loosely typed web address as the URL it parses to', async () => {
    const { graph, figma, text } = setup()
    for (const [typed, written] of [
      ['http:example.com', 'http://example.com/'],
      ['https:/example.com/docs', 'https://example.com/docs'],
      ['localhost:3000/app', 'https://localhost:3000/app'],
      ['example.com:8080', 'https://example.com:8080']
    ]) {
      const result = await runTool(figma, 'set_text_properties', {
        id: text.id,
        align_horizontal: 'CENTER',
        hyperlink: typed
      })
      expect(result).toEqual({ id: text.id, updated: ['textAlignHorizontal', 'hyperlink'] })
      expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))[0]?.link.value).toBe(written)
    }
  })

  test('refuses a phone or script address even with a digit after its scheme', async () => {
    const { graph, figma, text } = setup()
    for (const hyperlink of ['tel:123', 'sms:5551234', SHORT_SCRIPT_URL]) {
      const result = await runTool(figma, 'set_text_properties', {
        id: text.id,
        align_horizontal: 'CENTER',
        hyperlink
      })
      expect(result).toEqual({ error: expect.stringContaining('not a link the editor opens') })
    }
    const node = getNodeOrThrow(graph, text.id)
    expect(node.textAlignHorizontal).toBe('LEFT')
    expect(hyperlinkSpans(node)).toEqual([])
  })
})

describe('set_font_range hyperlink', () => {
  test('links a range of the text', async () => {
    const { graph, figma, text } = setup()
    const result = await runTool(figma, 'set_font_range', {
      id: text.id,
      start: 9,
      end: 13,
      hyperlink: 'https://openpencil.dev/docs'
    })
    expect(result).toEqual({
      id: text.id,
      range: { start: 9, end: 13 },
      hyperlink: 'https://openpencil.dev/docs'
    })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))).toEqual([
      { start: 9, end: 13, link: { type: 'URL', value: 'https://openpencil.dev/docs' } }
    ])
    await runTool(figma, 'set_font_range', { id: text.id, start: 9, end: 13, hyperlink: null })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))).toEqual([])
  })

  test('refuses data and file addresses', async () => {
    const { figma, text } = setup()
    for (const hyperlink of ['data:text/html,hi', 'file:///etc/passwd', 'tel:+123', 'tel:123']) {
      expect(
        await runTool(figma, 'set_font_range', { id: text.id, start: 0, end: 4, hyperlink })
      ).toEqual({ error: expect.stringContaining('not a link the editor opens') })
    }
  })

  test('links a loosely typed web address without leaving a half-applied edit', async () => {
    const { graph, figma, text } = setup()
    const result = await runTool(figma, 'set_font_range', {
      id: text.id,
      start: 0,
      end: 4,
      color: '#ff0000',
      hyperlink: 'http:example.com'
    })
    expect(result).toMatchObject({ hyperlink: 'http://example.com/' })
    expect(hyperlinkSpans(getNodeOrThrow(graph, text.id))).toEqual([
      { start: 0, end: 4, link: { type: 'URL', value: 'http://example.com/' } }
    ])
  })
})
