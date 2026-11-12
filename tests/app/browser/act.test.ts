import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { Window } from 'happy-dom'

import {
  acceptActResult,
  BROWSER_ACTION_UNREADABLE,
  BROWSER_NOT_EDITABLE,
  BROWSER_TEXT_TOO_LONG,
  prepareBrowserAct
} from '@/app/browser/act'

import { repoPath } from '#tests/helpers/paths'

const BODY = readFileSync(repoPath('desktop/src/system/browser-act.js'), 'utf8')

function runAct(window: Window, request: Record<string, unknown>): string {
  const source = `(() => {\nconst __openpencilActRequest = ${JSON.stringify(request)};\n${BODY}\n})()`
  const reported = window.eval(source)
  if (typeof reported !== 'string') throw new Error('The action timed out.')
  return reported
}

describe('a page action', () => {
  test('clicks, types, presses a key, and scrolls the element it was given', () => {
    const window = new Window()
    window.document.body.innerHTML =
      '<button id="go">Go</button><input id="email" /><div id="note"></div><div id="pane"></div>'
    const button = window.document.querySelector('#go')
    const field = window.document.querySelector('#email')
    const pane = window.document.querySelector('#pane')
    if (!button || !field || !pane) throw new Error('The fixture is missing an element')
    let clicked = false
    let key = ''
    button.addEventListener('click', () => {
      clicked = true
    })
    field.addEventListener('keydown', (event) => {
      if ('key' in event && typeof event.key === 'string') key = event.key
    })
    pane.scrollBy = (dx: number, dy: number) => {
      pane.scrollLeft = dx
      pane.scrollTop = dy
    }

    expect(acceptActResult(runAct(window, { kind: 'click', selector: '#go' }))).toBe('ok')
    expect(clicked).toBe(true)
    expect(acceptActResult(runAct(window, { kind: 'click', selector: '#gone' }))).toBe('missing')

    const hostile = 'a"});alert(1);//'
    expect(
      acceptActResult(runAct(window, { kind: 'type', selector: '#email', text: hostile }))
    ).toBe('ok')
    expect(field).toHaveProperty('value', hostile)
    expect(acceptActResult(runAct(window, { kind: 'type', selector: '#note', text: 'no' }))).toBe(
      'not_editable'
    )

    expect(acceptActResult(runAct(window, { kind: 'key', selector: '#email', key: 'Enter' }))).toBe(
      'ok'
    )
    expect(key).toBe('Enter')
    expect(
      acceptActResult(runAct(window, { kind: 'scroll', selector: '#pane', dx: 4, dy: 9 }))
    ).toBe('ok')
    expect(pane.scrollTop).toBe(9)
    expect(runAct(window, { kind: 'probe-selector', selector: '#gone' })).toBe('"no"')
    window.happyDOM.abort()
  })

  test('a reply that is not a code is refused, and a long text never reaches the page', () => {
    expect(() => acceptActResult('{"html":"<script>"}')).toThrow(BROWSER_ACTION_UNREADABLE)
    expect(() => acceptActResult('not json')).toThrow(BROWSER_ACTION_UNREADABLE)
    expect(
      prepareBrowserAct({
        kind: 'type',
        selector: '#email',
        text: 'x'.repeat(2001),
        key: '',
        dx: 0,
        dy: 0
      })
    ).toBe(BROWSER_TEXT_TOO_LONG)
    expect(BROWSER_NOT_EDITABLE).toBe('The element cannot take text.')
  })
})
