import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { Window } from 'happy-dom'

import { elementReference, parseElementMark } from '@/app/ai/chat/references/element'
import { findReferences, referenceLink } from '@/app/ai/chat/references/link'
import { openReference, resolveReference } from '@/app/ai/chat/references/resolve'
import { applyElementMarkHover } from '@/app/browser/mark'

import { repoPath } from '#tests/helpers/paths'

const BODY = readFileSync(repoPath('desktop/src/system/browser-mark.js'), 'utf8')

function runMark(window: Window, request: { action: string; selector?: string }): string {
  const source = `(() => {\nconst __openpencilMarkRequest = ${JSON.stringify(request)};\n${BODY}\n})()`
  const reported = window.eval(source)
  const outlined = window.document.querySelector('[data-openpencil-mark]') !== null
  if (typeof reported !== 'string') throw new Error('The page did not answer in time.')
  return `${reported}:${outlined ? 'box' : 'none'}`
}

describe('a chat mark on the page', () => {
  test('a matching selector draws a box, and a miss or a clear leaves none', () => {
    const window = new Window()
    window.document.body.innerHTML = '<button id="go">Go</button>'
    expect(runMark(window, { action: 'show', selector: '#go' })).toBe('{"shown":true}:box')
    expect(runMark(window, { action: 'show', selector: '#gone' })).toBe('{"shown":false}:none')
    expect(runMark(window, { action: 'show', selector: '#go' })).toBe('{"shown":true}:box')
    expect(runMark(window, { action: 'clear' })).toBe('{"shown":false}:none')
    window.happyDOM.abort()
  })

  test('a different page does not ask for an outline, and the chip survives a reload', async () => {
    const reference = elementReference('https://example.com/docs', 'a[href="x"]', 'Docs')
    if (!reference) throw new Error('The mark could not be stored')
    const message = `See ${referenceLink(reference)}`
    expect(findReferences(message).map(({ reference: found }) => found)).toEqual([reference])
    expect(parseElementMark(reference.id)).toEqual({
      url: 'https://example.com/docs',
      selector: 'a[href="x"]'
    })
    expect(resolveReference(null, reference, new Set()).present).toBe(true)
    expect(resolveReference(null, reference, new Set()).node).toBeNull()

    const calls: string[] = []
    const actions = {
      async show(selector: string) {
        calls.push(`show:${selector}`)
      },
      async clear() {
        calls.push('clear')
      }
    }
    const mark = parseElementMark(reference.id)
    await applyElementMarkHover(mark, true, { open: true, url: 'https://other.example/' }, actions)
    await applyElementMarkHover(
      mark,
      true,
      { open: false, url: 'https://example.com/docs' },
      actions
    )
    await applyElementMarkHover(
      null,
      true,
      { open: true, url: 'https://example.com/docs' },
      actions
    )
    expect(calls).toEqual([])
    await applyElementMarkHover(
      parseElementMark(reference.id),
      true,
      { open: true, url: 'https://example.com/docs' },
      actions
    )
    await applyElementMarkHover(
      parseElementMark(reference.id),
      false,
      { open: true, url: 'https://example.com/docs' },
      actions
    )
    expect(calls).toEqual(['show:a[href="x"]', 'clear'])
    await openReference({} as never, reference)
  })
})
