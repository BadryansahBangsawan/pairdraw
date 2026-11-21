import { describe, expect, test } from 'bun:test'

import type { RGBAImage } from '@pairdraw/core/io/formats/raster'
import { crossfade, dim, drawOver, filledImage } from '@pairdraw/core/io/formats/video'

function image(width: number, height: number, ...pixels: number[][]): RGBAImage {
  return { width, height, data: new Uint8Array(pixels.flat()) }
}

describe('video frame compositing', () => {
  test('fills a frame with an opaque color', () => {
    expect(filledImage(2, 1, { r: 1, g: 0.5, b: 0, a: 1 })).toEqual(
      image(2, 1, [255, 128, 0, 255], [255, 128, 0, 255])
    )
  })

  test('draws a layer over the frame at an offset, clipped to the frame', () => {
    const target = filledImage(2, 2, { r: 0, g: 0, b: 0, a: 1 })
    // One opaque white pixel and one half-transparent red one, the red falling off the frame.
    drawOver(target, image(2, 1, [255, 255, 255, 255], [255, 0, 0, 128]), 1, 1)

    expect(target).toEqual(
      image(2, 2, [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255], [255, 255, 255, 255])
    )
  })

  test('blends a half-transparent layer over what is under it', () => {
    const target = filledImage(1, 1, { r: 0, g: 0, b: 1, a: 1 })
    drawOver(target, image(1, 1, [255, 0, 0, 128]), 0, 0)

    // 128/255 of red over blue.
    expect([...target.data]).toEqual([128, 0, 127, 255])
  })

  test('dims a frame toward black under an overlay', () => {
    const target = image(1, 1, [200, 100, 50, 255])
    dim(target, 0.4)

    expect([...target.data]).toEqual([120, 60, 30, 255])
  })

  test('crossfades two frames by the share of the second', () => {
    const from = image(1, 1, [0, 0, 0, 255])
    const to = image(1, 1, [200, 100, 255, 255])

    expect([...crossfade(from, to, 0.25).data]).toEqual([50, 25, 64, 255])
    expect(crossfade(from, to, 0)).toEqual(from)
    expect(crossfade(from, to, 1)).toEqual(to)
  })
})
