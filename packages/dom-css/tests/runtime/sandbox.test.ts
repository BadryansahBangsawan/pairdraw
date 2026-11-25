import { describe, expect, it } from 'bun:test'

import { serializeHTML } from '#dom-css/export/html'

import { sandboxedDesignDocument } from '#dom-css/runtime/browser/sandbox'
import { createHeadlessCSSRuntime } from '#dom-css/runtime/headless/runtime'

const AGENT_HTML = '<div class="flex gap-2 p-4 bg-red-500"><div class="w-5 h-5 bg-blue-500"></div></div>'

const PASTE_HTML =
  '<meta charset="utf-8"><div style="display: flex; gap: 8px; padding: 12px; width: 200px; background-color: rgb(16, 185, 129)"><span style="color: white">Sale</span><b>-20%</b></div>'

const HOSTILE_HTML = [
  '<div onclick="alert(1)" class="card">',
  '<img src="x" onerror="alert(2)" width="10" height="10">',
  '<a href="javascript:alert(3)">link</a>',
  '<script>alert(4)</script>',
  '<iframe srcdoc="<script>alert(5)</script>"></iframe>',
  '<object data="javascript:alert(6)"></object>',
  '<img src="https://example.org/picture.png" alt="kept">',
  '</div>'
].join('')

const EXECUTABLE = /<script|\son\w+\s*=|javascript:|data:text\/html|srcdoc/i

/** What the styling frame would insert for this markup, as the runtime sandboxes it. */
function frameMarkup(html: string): string {
  const runtime = createHeadlessCSSRuntime()
  return serializeHTML(sandboxedDesignDocument(runtime.parseHTML(html)))
}

describe('the markup a styling sandbox inserts', () => {
  it('holds nothing executable for the payloads the app imports and pastes', () => {
    expect(EXECUTABLE.test(frameMarkup(AGENT_HTML))).toBe(false)
    expect(EXECUTABLE.test(frameMarkup(PASTE_HTML))).toBe(false)
  })

  it('keeps the layout fields of an ordinary element', () => {
    const markup = frameMarkup(AGENT_HTML)
    expect(markup).toContain('class="flex gap-2 p-4 bg-red-500"')
    expect(markup).toContain('<div class="w-5 h-5 bg-blue-500"></div>')
  })

  it('removes handlers, script documents, and executable URLs from imported markup', () => {
    const markup = frameMarkup(HOSTILE_HTML)
    expect(EXECUTABLE.test(markup)).toBe(false)
    expect(markup).toContain('class="card"')
    expect(markup).toContain('src="https://example.org/picture.png"')
    expect(markup).toContain('alt="kept"')
  })
})
