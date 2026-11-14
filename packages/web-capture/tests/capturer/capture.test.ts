import { afterEach, describe, expect, test } from 'bun:test'

import { createPage } from '#web-capture-tests/dom'

import type { WebCaptureElement, WebCaptureNode } from '@pairdraw/web-capture'
import { captureElement, capturePage } from '@pairdraw/web-capture/capturer'

const STYLE = `
  .card { display: flex; flex-direction: column; gap: 8px; padding: 16px; color: #111111;
    background-color: #ffffff; border-radius: 12px; font-family: "Inter", sans-serif; }
  .hidden { display: none; }
  .ghost { visibility: hidden; }
  .contents { display: contents; }
`

let close: (() => Promise<void>) | undefined
afterEach(async () => {
  await close?.()
  close = undefined
})

function open(body: string) {
  const page = createPage(
    `<!doctype html><html><head><title>Pricing</title><style>${STYLE}</style></head><body>${body}</body></html>`
  )
  close = page.close
  return page.document
}

function elements(nodes: readonly WebCaptureNode[]): WebCaptureElement[] {
  return nodes.filter((node): node is WebCaptureElement => node.type === 'element')
}

describe('capturing an element', () => {
  test('records its tree with computed styles, text, and safe attributes', async () => {
    const document = open(
      '<div class="card" id="plan" onclick="buy()"><h2>Pro</h2><a href="/buy">Buy</a><span class="hidden">x</span></div>'
    )
    const card = document.querySelector('.card')
    if (!card) throw new Error('fixture has a card')

    const capture = await captureElement(card, { inlineImages: false })

    expect(capture).toMatchObject({
      format: 'pairdraw/web-capture',
      version: 1,
      scope: 'element',
      source: { url: 'https://example.com/pricing/', title: 'Pricing' },
      truncated: false
    })
    const { root } = capture
    expect(root.tagName).toBe('div')
    expect(root.attrs).toEqual({ id: 'plan', class: 'card' })
    expect(root.computedStyle).toMatchObject({
      display: 'flex',
      'flex-direction': 'column',
      'padding-top': '16px',
      'border-top-left-radius': '12px'
    })
    expect(root.computedStyle).not.toHaveProperty('position')
    const [heading, link] = elements(root.children)
    expect(root.children.filter((node) => node.type === 'element')).toHaveLength(2)
    expect(heading?.children).toEqual([{ type: 'text', text: 'Pro' }])
    expect(link?.attrs).toEqual({ href: 'https://example.com/buy' })
    expect(capture.fonts.map((font) => font.family)).toContain('Inter')
  })

  test('flattens boxless elements, fades hidden ones, and reads form fields as text', async () => {
    const document = open(
      '<div id="root"><div class="contents"><p>One</p><p>Two</p></div><p class="ghost">Gone</p><input value="ada@example.com"><input type="password" value="abc"><textarea placeholder="Notes"></textarea></div>'
    )
    const root = document.getElementById('root')
    if (!root) throw new Error('fixture has a root')

    const capture = await captureElement(root, { inlineImages: false })

    const children = elements(capture.root.children)
    expect(children.map((child) => child.tagName)).toEqual([
      'p',
      'p',
      'p',
      'input',
      'input',
      'textarea'
    ])
    expect(children[2]?.computedStyle.opacity).toBe('0')
    expect(children.slice(3).map((child) => child.children)).toEqual([
      [{ type: 'text', text: 'ada@example.com' }],
      [{ type: 'text', text: '•••' }],
      [{ type: 'text', text: 'Notes' }]
    ])
  })

  test('marks the capture truncated at the element limit', async () => {
    const document = open(`<ul id="list">${'<li>Item</li>'.repeat(10)}</ul>`)
    const list = document.getElementById('list')
    if (!list) throw new Error('fixture has a list')

    const capture = await captureElement(list, { inlineImages: false, maxElements: 4 })

    expect(elements(capture.root.children)).toHaveLength(3)
    expect(capture.truncated).toBe(true)
  })

  test('keeps the address of an image it does not inline and inlines data images', async () => {
    const document = open(
      '<div id="root"><img src="/logo.png" alt="Logo"><img src="data:image/png;base64,iVBORw0KGgo="></div>'
    )
    const root = document.getElementById('root')
    if (!root) throw new Error('fixture has a root')

    const linked = await captureElement(root, { inlineImages: false })
    expect(elements(linked.root.children).map((image) => image.attrs.src)).toEqual([
      'https://example.com/logo.png',
      'data:image/png;base64,iVBORw0KGgo='
    ])
  })

  test('refuses an element that is not displayed', async () => {
    const document = open('<p class="hidden" id="gone">Hi</p>')
    const gone = document.getElementById('gone')
    if (!gone) throw new Error('fixture has a paragraph')
    await expect(captureElement(gone)).rejects.toThrow('not displayed')
  })
})

describe('capturing a page', () => {
  test('captures the body on the page background with its margins as padding', async () => {
    const document = open(
      '<style>body { margin: 10px; padding-top: 4px }</style><main><h1>Plans</h1></main>'
    )

    const capture = await capturePage(document, { inlineImages: false })

    expect(capture.scope).toBe('page')
    expect(capture.root.tagName).toBe('body')
    expect(capture.root.computedStyle).toMatchObject({
      'background-color': 'rgb(255, 255, 255)',
      'padding-top': '14px',
      'padding-left': '10px',
      'box-sizing': 'border-box'
    })
    expect(elements(capture.root.children).map((child) => child.tagName)).toEqual(['main'])
  })
})
