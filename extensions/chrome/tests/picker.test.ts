import { afterEach, describe, expect, test } from 'bun:test'

import { Window } from 'happy-dom'

import { startPicker } from '../src/picker'

let window: Window | undefined

afterEach(async () => {
  await window?.happyDOM.close()
  window = undefined
})

/** happy-dom's documents implement the DOM the picker uses, without lib.dom's declarations. */
function isDocument(value: unknown): value is Document {
  return typeof value === 'object' && value !== null && 'documentElement' in value
}

function createPage(html: string): Document {
  window = new Window({ url: 'https://example.com/' })
  window.document.write(html)
  // Read as unknown, so the guard narrows to lib.dom's type rather than intersect with it.
  const document: unknown = window.document
  if (!isDocument(document)) throw new Error('happy-dom has no DOM')
  return document
}

/** Shadow roots the page attaches from now on, closed ones included. */
function recordShadowRoots(document: Document): ShadowRoot[] {
  const view = document.defaultView
  if (!view) throw new Error('The page has no window')
  const roots: ShadowRoot[] = []
  const { prototype } = view.Element
  // Read through its descriptor, so the original method is never held unbound.
  const attach: unknown = Object.getOwnPropertyDescriptor(prototype, 'attachShadow')?.value
  if (typeof attach !== 'function') throw new Error('The page cannot attach shadow roots')
  prototype.attachShadow = function (init) {
    const root: unknown = Reflect.apply(attach, this, [init])
    if (!(root instanceof view.ShadowRoot)) throw new Error('No shadow root was attached')
    roots.push(root)
    return root
  }
  return roots
}

function press(document: Document, key: string) {
  const view = document.defaultView
  if (!view) throw new Error('The page has no window')
  view.dispatchEvent(new view.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('element picker', () => {
  test('picks with the keyboard alone, starting at the body', () => {
    const document = createPage('<main><section id="hero"><h1>Hi</h1></section></main>')
    const picked: Element[] = []
    startPicker(document, 'Pick', { onPick: (element) => picked.push(element) })

    press(document, 'ArrowDown')
    press(document, 'ArrowDown')
    press(document, 'Enter')

    expect(picked.map((element) => element.id || element.localName)).toEqual(['hero'])
  })

  test('starts at the focused element', () => {
    const document = createPage('<form><input id="email"></form>')
    document.getElementById('email')?.focus()
    const picked: Element[] = []
    startPicker(document, 'Pick', { onPick: (element) => picked.push(element) })

    press(document, 'ArrowUp')
    press(document, 'Enter')

    expect(picked.map((element) => element.localName)).toEqual(['form'])
  })

  test('announces how to pick as a status, and removes its overlay when it stops', () => {
    const document = createPage('<p>Hi</p>')
    const roots = recordShadowRoots(document)
    const stop = startPicker(document, 'Pick an element', { onPick: () => undefined })

    const status = roots.at(0)?.querySelector('[role="status"]')
    expect(status?.textContent).toBe('Pick an element')
    stop()
    expect(roots.at(0)?.host.isConnected).toBe(false)
  })
})
