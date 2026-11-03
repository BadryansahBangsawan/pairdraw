import { describe, expect, test } from 'bun:test'

import {
  SHADER_MODE_LARGE_STEP_SECONDS,
  SHADER_MODE_STEP_SECONDS,
  shaderModeKeyAction
} from '@/app/editor/shader-mode/keys'

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

describe('Shader Mode keys', () => {
  test('Space and K play or pause, Home goes back to the start', () => {
    expect(shaderModeKeyAction(key('Space'))).toEqual({ kind: 'toggle' })
    expect(shaderModeKeyAction(key('KeyK'))).toEqual({ kind: 'toggle' })
    expect(shaderModeKeyAction(key('Home'))).toEqual({ kind: 'restart' })
  })

  test('arrows step through the animation, further with Shift', () => {
    expect(shaderModeKeyAction(key('ArrowRight'))).toEqual({
      kind: 'step',
      seconds: SHADER_MODE_STEP_SECONDS
    })
    expect(shaderModeKeyAction(key('ArrowLeft', { shift: true }))).toEqual({
      kind: 'step',
      seconds: -SHADER_MODE_LARGE_STEP_SECONDS
    })
  })

  test('leaves modified keys and other keys to the app', () => {
    expect(shaderModeKeyAction(key('Space', { meta: true }))).toBeNull()
    expect(shaderModeKeyAction(key('ArrowRight', { alt: true }))).toBeNull()
    expect(shaderModeKeyAction(key('Space', { shift: true }))).toBeNull()
    expect(shaderModeKeyAction(key('Escape'))).toBeNull()
    expect(shaderModeKeyAction(key('KeyZ', { ctrl: true }))).toBeNull()
  })
})
