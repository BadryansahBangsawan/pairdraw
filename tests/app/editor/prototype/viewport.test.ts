import { describe, expect, test } from 'bun:test'

import { playFitArea } from '@/app/editor/prototype/viewport'

const STAGE = { width: 800, height: 600 }
const PHONE = { x: 100, y: 50, width: 390, height: 2400 }

describe('what play fits of a frame', () => {
  test('is the whole frame when it does not scroll', () => {
    expect(playFitArea(PHONE, 'NONE', STAGE)).toEqual(PHONE)
  })

  test('is its width from the top when it scrolls vertically and is taller than the stage', () => {
    expect(playFitArea(PHONE, 'VERTICAL', STAGE)).toEqual({ x: 100, y: 50, width: 390, height: 292.5 })
    // A frame no taller than the stage fits whole.
    const card = { x: 0, y: 0, width: 400, height: 200 }
    expect(playFitArea(card, 'VERTICAL', STAGE)).toEqual(card)
  })

  test('is its height from the left when it scrolls sideways and is wider than the stage', () => {
    const strip = { x: 0, y: 0, width: 3000, height: 300 }
    expect(playFitArea(strip, 'HORIZONTAL', STAGE)).toEqual({ x: 0, y: 0, width: 400, height: 300 })
    expect(playFitArea(strip, 'BOTH', STAGE)).toEqual({ x: 0, y: 0, width: 400, height: 300 })
    expect(playFitArea(PHONE, 'HORIZONTAL', STAGE)).toEqual(PHONE)
  })

  test('is the whole frame on a stage with no size yet', () => {
    expect(playFitArea(PHONE, 'VERTICAL', { width: 0, height: 0 })).toEqual(PHONE)
  })
})
