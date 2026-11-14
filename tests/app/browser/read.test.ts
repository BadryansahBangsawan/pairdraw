import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { Window } from 'happy-dom'

import { acceptElementReading, acceptPageOutline } from '@/app/browser/read'

import { repoPath } from '#tests/helpers/paths'

const BODY = readFileSync(repoPath('desktop/src/system/browser-read.js'), 'utf8')

function readPage(html: string, request: { kind: string; selector?: string }): string {
  const window = new Window()
  window.document.body.innerHTML = html
  const source = `(() => {\nconst __pairdrawReadRequest = ${JSON.stringify(request)};\n${BODY}\n})()`
  const reported = window.eval(source)
  window.happyDOM.abort()
  if (typeof reported !== 'string') throw new Error('The page returned nothing we can read.')
  return reported
}

describe('reading the open page', () => {
  test('one selector returns its tag, role, text, and box', () => {
    const reading = acceptElementReading(
      readPage('<button id="go">Go now</button>', { kind: 'element', selector: '#go' })
    )
    expect(reading).toMatchObject({
      untrustedPageText: true,
      tag: 'button',
      role: 'button',
      text: 'Go now'
    })
    expect(reading.box).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number)
    })
  })

  test('a selector that matches nothing is a miss, and a script address is not a link', () => {
    expect(() =>
      acceptElementReading(readPage('<main></main>', { kind: 'element', selector: '#gone' }))
    ).toThrow('The element is not on the page')
    const scriptAddress = ['javascript', 'alert(1)'].join(':')
    const outline = readPage(
      `<h1 id="title">Hello</h1><a href="https://example.com/docs">Docs</a><a href="${scriptAddress}">Bad</a><button>Go</button><input aria-label="Email" type="email" />`,
      { kind: 'outline' }
    )
    const accepted = acceptPageOutline(outline)
    expect(accepted.untrustedPageText).toBe(true)
    expect(accepted.headings).toEqual([
      expect.objectContaining({ level: 1, text: 'Hello', selector: '#title' })
    ])
    expect(accepted.links).toEqual([
      expect.objectContaining({ text: 'Docs', href: 'https://example.com/docs' }),
      expect.objectContaining({ text: 'Bad', href: '' })
    ])
    expect(accepted.buttons).toEqual([expect.objectContaining({ text: 'Go' })])
    expect(accepted.inputs).toEqual([expect.objectContaining({ label: 'Email', type: 'email' })])
  })

  test('a broken reply is refused, and extra outline items are dropped', () => {
    expect(() => acceptPageOutline('not json')).toThrow('The page returned nothing we can read.')
    expect(() => acceptElementReading('{"tag":1}')).toThrow(
      'The page returned nothing we can read.'
    )
    const headings = Array.from({ length: 30 }, (_, index) => ({
      level: 2,
      text: `H${index}`,
      selector: `h2:nth-of-type(${index + 1})`
    }))
    const accepted = acceptPageOutline(
      JSON.stringify({ headings, links: [], buttons: [], inputs: [{ label: 1 }] })
    )
    expect(accepted.headings).toHaveLength(24)
    expect(accepted.inputs).toEqual([])
  })
})
