import { describe, expect, test } from 'bun:test'

import { presentationKeyAction, presentationScrollStep } from '@/app/slides/keys'

function key(
  code: string,
  modifiers: Partial<Record<'shift' | 'alt' | 'ctrl' | 'meta', boolean>> = {}
) {
  return {
    code,
    shiftKey: modifiers.shift ?? false,
    altKey: modifiers.alt ?? false,
    ctrlKey: modifiers.ctrl ?? false,
    metaKey: modifiers.meta ?? false
  }
}

describe('presentation keys', () => {
  test('arrows step, Space and Enter go forward, Shift+Space goes back', () => {
    expect(
      ['ArrowRight', 'ArrowLeft', 'Space', 'Enter', 'ArrowDown', 'ArrowUp', 'Home', 'End'].map(
        (code) => presentationKeyAction(key(code))
      )
    ).toEqual(['next', 'previous', 'forward', 'forward', 'forward', 'back', 'first', 'last'])
    expect(presentationKeyAction(key('Space', { shift: true }))).toBe('back')
  })

  test('keys held with a command modifier belong to the app', () => {
    expect(presentationKeyAction(key('Enter', { meta: true }))).toBeNull()
    expect(presentationKeyAction(key('ArrowRight', { ctrl: true }))).toBeNull()
    expect(presentationKeyAction(key('ArrowDown', { alt: true }))).toBeNull()
    expect(presentationKeyAction(key('KeyA'))).toBeNull()
  })

  test('an arrow scrolls a little, the page keys nearly a screen', () => {
    expect(presentationScrollStep('ArrowDown', 1000)).toBeLessThan(
      presentationScrollStep('PageDown', 1000)
    )
    expect(presentationScrollStep('Space', 1000)).toBeLessThan(1000)
  })
})
