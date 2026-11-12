import { describe, expect, test } from 'bun:test'

import { BROWSER_DESKTOP_ONLY, BROWSER_WINDOW_CLOSED } from '@/app/browser'
import { pageTextPayload } from '@/app/browser/page-text'
import { PAGE_TEXT_UNREADABLE, readOpenPageText, type OpenPageRead } from '@/app/research/page'
import { PAGE_TEXT_LIMIT, PAGE_TITLE_LIMIT } from '@/app/research/schema'

const FIXTURE = {
  url: 'https://example.com/notes',
  title: 'Field notes',
  text: 'A visible sentence on the page.'
}

function readOf(page: unknown, calls: { count: number }): OpenPageRead['read'] {
  return () => {
    calls.count += 1
    return Promise.resolve(page)
  }
}

describe('open page text', () => {
  test('returns the open page url, title, and visible text', async () => {
    const calls = { count: 0 }
    const result = await readOpenPageText({
      desktop: true,
      open: true,
      url: FIXTURE.url,
      read: readOf(FIXTURE, calls)
    })
    expect(result).toEqual({ ok: true, page: FIXTURE })
    expect(calls.count).toBe(1)
  })

  test('cuts a long page to the limit and still returns it', async () => {
    const result = await readOpenPageText({
      desktop: true,
      open: true,
      read: async () => ({
        url: 'https://example.com/long',
        title: 'T'.repeat(PAGE_TITLE_LIMIT + 40),
        text: 'a'.repeat(PAGE_TEXT_LIMIT + 500)
      })
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.page.title).toHaveLength(PAGE_TITLE_LIMIT)
    expect(result.page.text).toHaveLength(PAGE_TEXT_LIMIT)
  })

  test('a capture-shaped payload is not page text and creates no layers', async () => {
    const layers: string[] = []
    const result = await readOpenPageText({
      desktop: true,
      open: true,
      read: async () => {
        layers.push('would-import')
        return { html: '<div data-capture="page"><p>Imported</p></div>' }
      }
    })
    expect(result).toEqual({ ok: false, error: PAGE_TEXT_UNREADABLE })
    expect(layers).toEqual(['would-import'])
    expect(JSON.stringify(result)).not.toContain('data-capture')
  })

  test('a tag inside the visible text stays characters', async () => {
    const text = 'Before <div>not a layer</div> after'
    const result = await readOpenPageText({
      desktop: true,
      open: true,
      read: async () => ({ ...FIXTURE, text })
    })
    expect(result).toEqual({ ok: true, page: { ...FIXTURE, text } })
  })

  test('a non-http address never reaches the window', async () => {
    const calls = { count: 0 }
    const result = await readOpenPageText({
      desktop: true,
      open: true,
      url: 'file:///etc/passwd',
      read: readOf(FIXTURE, calls)
    })
    expect(result).toEqual({
      ok: false,
      error: 'The browser opens http and https addresses only.'
    })
    expect(calls.count).toBe(0)
  })

  test('a file url reported by the page is refused', async () => {
    const result = await readOpenPageText({
      desktop: true,
      open: true,
      read: async () => ({ ...FIXTURE, url: 'file:///tmp/notes.html' })
    })
    expect(result).toEqual({
      ok: false,
      error: 'The browser opens http and https addresses only.'
    })
  })

  test('a closed window is refused and not read', async () => {
    const calls = { count: 0 }
    const result = await readOpenPageText({
      desktop: true,
      open: false,
      read: readOf(FIXTURE, calls)
    })
    expect(result).toEqual({ ok: false, error: BROWSER_WINDOW_CLOSED })
    expect(calls.count).toBe(0)
  })

  test('outside the desktop app the window is not asked', async () => {
    const calls = { count: 0 }
    const result = await readOpenPageText({
      desktop: false,
      open: true,
      read: readOf(FIXTURE, calls)
    })
    expect(result).toEqual({ ok: false, error: BROWSER_DESKTOP_ONLY })
    expect(calls.count).toBe(0)
  })

  test('the window command payload is parsed as json and a capture string stays text', () => {
    expect(pageTextPayload(JSON.stringify(FIXTURE))).toEqual(FIXTURE)
    const html = '<div data-capture="page"></div>'
    expect(pageTextPayload(html)).toBe(html)
  })
})
