import { describe, expect, test } from 'bun:test'

import { serializeHTML } from '#dom-css/export/html'
import { jsx, jsxToDesignDocumentCore } from '#dom-css/import/jsx/core'
import { parseFragment } from 'parse5'

function attributeNames(html: string): string[] {
  const [element] = parseFragment(html).childNodes
  if (!element || !('attrs' in element)) throw new Error('Expected an element')
  return element.attrs.map((attr) => attr.name)
}

describe('serializeHTML', () => {
  test('leaves out an imported attribute whose name would write other attributes', () => {
    const html = serializeHTML(
      jsxToDesignDocumentCore(
        jsx('img', { src: 'x', 'x onerror': 'alert(1)', 'y" onload=alert(2) z': '0', alt: 'a' })
      )
    )

    expect(attributeNames(html)).toEqual(['src', 'alt'])
  })

  test('writes a tag name that would write attributes as a div with its content', () => {
    const html = serializeHTML(
      jsxToDesignDocumentCore(jsx('img src=x onerror=alert(1)', { title: 't', children: 'A' }))
    )
    const [element] = parseFragment(html).childNodes

    expect(element?.nodeName).toBe('div')
    expect(attributeNames(html)).toEqual(['title'])
    expect(html).toContain('A</div>')
  })

  test('writes custom element and SVG tag names as they are', () => {
    const html = serializeHTML(
      jsxToDesignDocumentCore(jsx('my-widget', { children: jsx('linearGradient', {}) }))
    )

    expect(html).toBe('<my-widget><linearGradient></linearGradient></my-widget>')
  })

  test('writes namespaced, data, and custom attribute names as they are', () => {
    const html = serializeHTML(
      jsxToDesignDocumentCore(jsx('use', { 'xlink:href': '#a', 'data-name': 'A', '@click': 'go' }))
    )

    expect(attributeNames(html)).toEqual(['xlink:href', 'data-name', '@click'])
  })
})
