import { afterAll, describe, expect, test } from 'bun:test'

import { createPage } from '#web-capture-tests/dom'

import { hasWebContent, MAX_WEB_HTML_LENGTH, sanitizeWebHTML } from '@open-pencil/web-capture'

const page = createPage('<!doctype html><html><body></body></html>')
const { parser } = page
afterAll(() => page.close())

describe('sanitizing web HTML', () => {
  test('removes scripts, frames, and event handlers', () => {
    const html = sanitizeWebHTML(
      '<div onclick="steal()"><img src="https://cdn.example.com/a.png" onerror="steal()"><script>steal()</script><iframe src="https://evil.example"></iframe><svg><animate attributeName="href" to="javascript:steal()"/></svg></div>',
      { parser }
    )
    expect(html).toBe('<div><img src="https://cdn.example.com/a.png"><svg></svg></div>')
  })

  test('keeps only http, https, and mailto links and drops unresolved relative addresses', () => {
    const html = sanitizeWebHTML(
      '<a href="javascript:steal()">a</a><a href="mailto:hi@example.com">b</a><a href="/docs">c</a><img src="logo.png">',
      { parser }
    )
    expect(html).toBe('<a>a</a><a href="mailto:hi@example.com">b</a><a>c</a><img>')
    expect(
      sanitizeWebHTML('<a href="/docs">c</a>', { parser, baseURL: 'https://example.com/a/' })
    ).toBe('<a href="https://example.com/docs">c</a>')
  })

  test('keeps stylesheets, from the head too, without imports', () => {
    const html = sanitizeWebHTML(
      '<html><head><style>@import url(https://evil.example/x.css); p { color: red }</style></head><body><p>Hi</p></body></html>',
      { parser }
    )
    expect(html).toBe('<style> p { color: red }</style><p>Hi</p>')
  })

  test('leaves nothing to run when its output is parsed again (mutation XSS)', () => {
    const payloads = [
      '<math><mtext><table><mglyph><style><img src=x onerror="steal()">',
      '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=x onerror=steal()&gt;">',
      '<svg></p><style><a id="</style><img src=1 onerror=steal()>">',
      '<form><math><mtext></form><form><mglyph><style></math><img src onerror=steal()>'
    ]
    for (const payload of payloads) {
      const html = sanitizeWebHTML(payload, { parser })
      expect(sanitizeWebHTML(html, { parser })).toBe(html)
      const reparsed = parser.parseFromString(html, 'text/html')
      expect(reparsed.querySelector('script, iframe, math, mglyph')).toBeNull()
      const handlers = [...reparsed.querySelectorAll('*')].flatMap((element) =>
        element.getAttributeNames().filter((name) => name.toLowerCase().startsWith('on'))
      )
      expect(handlers).toEqual([])
    }
  })

  test('cleans what a parser grows from its own output until nothing is left to clean', () => {
    // A parser that reads the serialized form differently, as browsers do for some markup.
    const mutating = {
      parseFromString: (html: string, type: DOMParserSupportedType) =>
        parser.parseFromString(
          html.replaceAll('<i class="m"></i>', '<img onerror="steal()">'),
          type
        )
    }
    const html = sanitizeWebHTML("<p><i class='m'></i></p>", { parser: mutating })
    expect(html).toBe('<p><img></p>')
  })

  test('refuses HTML that never settles', () => {
    // Each parse grows a fresh handler, so no pass ever finds nothing to clean.
    const growing = {
      parseFromString: (html: string, type: DOMParserSupportedType) =>
        parser.parseFromString(html.replaceAll('<p>', '<p><b onclick="steal()"></b>'), type)
    }
    expect(sanitizeWebHTML('<p>Hi</p>', { parser: growing })).toBe('')
  })

  test('refuses HTML above the size limit', () => {
    expect(sanitizeWebHTML('a'.repeat(MAX_WEB_HTML_LENGTH + 1), { parser })).toBe('')
  })

  test('tells HTML that draws something from empty markup', () => {
    expect(hasWebContent('<p>Hello</p>', { parser })).toBe(true)
    expect(hasWebContent('<div><img src="data:image/png;base64,AAAA"></div>', { parser })).toBe(
      true
    )
    expect(hasWebContent('<meta charset="utf-8"><div> </div>', { parser })).toBe(false)
  })
})
