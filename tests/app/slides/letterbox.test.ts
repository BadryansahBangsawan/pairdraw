import { describe, expect, test } from 'bun:test'

import { letterboxRects } from '@/app/slides/letterbox'

const STAGE = { width: 1000, height: 600 }

describe('presentation letterbox', () => {
  test('covers the stage around a fitted slide, and nothing of the slide', () => {
    const rects = letterboxRects({ left: 100, top: 0, width: 800, height: 600 }, STAGE)
    expect(rects).toEqual([
      { left: 0, top: 0, width: 100, height: 600 },
      { left: 900, top: 0, width: 100, height: 600 }
    ])
  })

  test('a slide taller than the stage leaves only its sides covered', () => {
    const rects = letterboxRects({ left: 360, top: -400, width: 280, height: 4000 }, STAGE)
    expect(rects.map((rect) => rect.left)).toEqual([0, 640])
    expect(rects.every((rect) => rect.top === 0 && rect.height === 600)).toBe(true)
  })

  test('a slide filling the stage leaves nothing to cover', () => {
    expect(letterboxRects({ left: 0, top: 0, width: 1000, height: 600 }, STAGE)).toEqual([])
  })
})
