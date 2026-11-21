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

  test('reads a box an icon set paints through a mask as an image, not a box of solid color', async () => {
    // CSS icon sets draw an icon as the text color shown through the icon's shape.
    const icon = `url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E")`
    const document = open(
      `<div id="row"><span style='display: inline-block; width: 12px; height: 12px; background-color: #ededef; mask-image: ${icon}'></span><span>Vector</span></div>`
    )
    const row = document.getElementById('row')
    if (!row) throw new Error('fixture has a row')

    const capture = await captureElement(row, { inlineImages: false })

    const [masked, label] = elements(capture.root.children)
    expect(masked?.tagName).toBe('img')
    expect(masked?.computedStyle).not.toHaveProperty('background-color')
    expect(label?.tagName).toBe('span')
  })

  test('records the order of a flex item a page moves', async () => {
    const document = open(
      '<div id="row" style="display: flex"><span style="order: 2">Picker</span><span>Send</span></div>'
    )
    const row = document.getElementById('row')
    if (!row) throw new Error('fixture has a row')

    const capture = await captureElement(row, { inlineImages: false })

    const [picker, send] = elements(capture.root.children)
    expect(picker?.computedStyle.order).toBe('2')
    expect(send?.computedStyle).not.toHaveProperty('order')
  })

  test('refuses an element that is not displayed', async () => {
    const document = open('<p class="hidden" id="gone">Hi</p>')
    const gone = document.getElementById('gone')
    if (!gone) throw new Error('fixture has a paragraph')
    await expect(captureElement(gone)).rejects.toThrow('not displayed')
  })

  test('records a gradient background as the style an import paints', async () => {
    const document = open(
      '<div id="hero" style="background-image: linear-gradient(160deg, rgb(21, 28, 36), rgb(14, 20, 26)); color: rgb(255, 255, 255)">Hi</div>'
    )
    const hero = document.getElementById('hero')
    if (!hero) throw new Error('fixture has a hero')

    const capture = await captureElement(hero, { inlineImages: false })

    expect(capture.root.tagName).toBe('div')
    expect(capture.root.computedStyle['background-image']).toBe(
      'linear-gradient(160deg, rgb(21, 28, 36), rgb(14, 20, 26))'
    )
    expect(capture.root.children).toEqual([{ type: 'text', text: 'Hi' }])
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

describe('capturing a page without a body', () => {
  test('falls back to a root that is not HTML', async () => {
    const document = createPage('').document
    if (!document.documentElement) throw new Error('fixture has a root')
    document.removeChild(document.documentElement)
    const root = document.createElement('html')
    const main = document.createElement('main')
    main.textContent = 'Fallback'
    root.appendChild(main)
    document.appendChild(root)

    expect(document.body).toBeNull()
    const capture = await capturePage(document, { inlineImages: false })

    expect(capture.scope).toBe('page')
    expect(capture.root.tagName).toBe('html')
    expect(capture.root.children).toContainEqual(expect.objectContaining({ tagName: 'main' }))
    expect(capture.root.box).toMatchObject({ x: 0, y: 0 })
    expect(capture.root.computedStyle['background-color']).toBe('rgb(255, 255, 255)')
  })

  test('says when there is nothing to capture', async () => {
    const document = createPage('').document
    if (!document.documentElement) throw new Error('fixture has a root')
    document.removeChild(document.documentElement)

    await expect(capturePage(document, { inlineImages: false })).rejects.toThrow(
      'nothing to capture'
    )
  })
})
