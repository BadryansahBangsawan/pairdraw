import { expect, test } from 'bun:test'

import { Window } from 'happy-dom'

import { originatedInOverlay } from '@/app/shell/keyboard/overlay-guard'

import { asDouble } from '#tests/helpers/doubles'

const window = new Window()
// The guard asks whether a path member is an `Element`; happy-dom's own is not installed globally.
Object.assign(globalThis, { Element: window.Element })

/** Presses a key on the menu's item and reports whether the guard takes it for the widget's own. */
function keyPressedIn(attributeState: string | null): boolean {
  const { document } = window
  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  if (attributeState) menu.setAttribute('data-state', attributeState)
  const item = document.createElement('button')
  menu.append(item)
  // The guard reads the event's composed path, which only a dispatched event has. happy-dom's
  // KeyboardEvent stands in for the browser's, as the window's Element does above; the guard
  // reads it through the browser type, the dispatch through happy-dom's own.
  const event = new window.KeyboardEvent('keydown', { key: 'r', bubbles: true, composed: true })
  let taken = false
  item.addEventListener('keydown', () => {
    taken = originatedInOverlay(asDouble<KeyboardEvent>(event))
  })
  item.dispatchEvent(event)
  return taken
}

test('a key pressed in a menu that is closing belongs to the canvas', () => {
  // Reka keeps a closed menu, and the focus in it, until its exit animation ends.
  expect(keyPressedIn('closed')).toBe(false)
  expect(keyPressedIn('open')).toBe(true)
  expect(keyPressedIn(null)).toBe(true)
})
