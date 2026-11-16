import { describe, expect, test } from 'bun:test'

import { exportHTMLBundle } from '#dom-css/export/index'
import { parse, type DefaultTreeAdapterTypes } from 'parse5'

type ParseNode = DefaultTreeAdapterTypes.Node

function elements(node: ParseNode, tagName: string): DefaultTreeAdapterTypes.Element[] {
  const own = 'tagName' in node && node.tagName === tagName ? [node] : []
  const children = 'childNodes' in node ? node.childNodes : []
  return [...own, ...children.flatMap((child) => elements(child, tagName))]
}

function textOf(element: DefaultTreeAdapterTypes.Element): string {
  return element.childNodes.map((child) => ('value' in child ? child.value : '')).join('')
}

async function standalonePage(background: string): Promise<string> {
  const bundle = await exportHTMLBundle(
    {
      type: 'document',
      children: [
        { type: 'element', tagName: 'div', attrs: {}, inlineStyle: { background }, children: [] }
      ]
    },
    { html: 'standalone', style: 'inline' }
  )
  const page = bundle.files.find((file) => file.path === bundle.entrypoint)
  if (typeof page?.content !== 'string') throw new Error('Expected an HTML page')
  return page.content
}

describe('the standalone page stylesheet', () => {
  test('keeps an imported style value inside the style element', async () => {
    const page = parse(
      await standalonePage('url("</StYlE ><img src=x onerror=alert(document.domain)>")')
    )
    const [style, ...extraStyles] = elements(page, 'style')

    expect(extraStyles).toEqual([])
    expect(elements(page, 'img')).toEqual([])
    // CSS reads `\/` as `/`, so the URL is the one the document gave.
    expect(textOf(style)).toContain(
      '.op-0{background: url("<\\/StYlE ><img src=x onerror=alert(document.domain)>")}'
    )
  })

  test('writes other style text as it is', async () => {
    const page = parse(await standalonePage('url("a<b.png")'))

    expect(textOf(elements(page, 'style')[0])).toContain('.op-0{background: url("a<b.png")}')
  })
})
