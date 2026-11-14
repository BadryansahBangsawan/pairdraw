import { describe, expect, test } from 'bun:test'

import { coverImageTransform } from '@pairdraw/scene-graph/images'
import Matrix from '@pairdraw/scene-graph/matrix'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

import {
  coveringImageBounds,
  croppedImageTransform,
  hitTestImageCrop,
  imageCropLayout,
  imageCropQuad,
  imageTransformFromLocalMatrix,
  pannedImageTransform,
  resizedCropRect,
  scaledImageTransform,
  type ImageCropQuad
} from '#core/geometry'

const WHOLE = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
// A 400 × 300 image covering a 200 × 100 layer, as Fill frames it: scaled to 200 × 150, centred.
const COVER = coverImageTransform(200, 100, 400, 300)

function close(actual: Vector, expected: Vector) {
  expect(actual.x).toBeCloseTo(expected.x, 6)
  expect(actual.y).toBeCloseTo(expected.y, 6)
}

function closeRect(actual: Rect, expected: Rect) {
  expect(actual.x).toBeCloseTo(expected.x, 6)
  expect(actual.y).toBeCloseTo(expected.y, 6)
  expect(actual.width).toBeCloseTo(expected.width, 6)
  expect(actual.height).toBeCloseTo(expected.height, 6)
}

function quad(t: Parameters<typeof imageCropQuad>[0], width: number, height: number) {
  const corners = imageCropQuad(t, width, height)
  if (!corners) throw new Error('expected an image quad')
  return corners
}

function closeQuad(actual: ImageCropQuad, expected: ImageCropQuad) {
  actual.forEach((point, index) => close(point, expected[index]))
}

describe('image crop geometry', () => {
  test('a crop of the whole image fills the layer', () => {
    closeQuad(quad(WHOLE, 200, 100), [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 0, y: 100 }
    ])
  })

  test('the Fill framing overhangs the layer above and below', () => {
    closeQuad(quad(COVER, 200, 100), [
      { x: 0, y: -25 },
      { x: 200, y: -25 },
      { x: 200, y: 125 },
      { x: 0, y: 125 }
    ])
    closeRect(coveringImageBounds(COVER, 200, 100) ?? { x: 0, y: 0, width: 0, height: 0 }, {
      x: 0,
      y: -25,
      width: 200,
      height: 150
    })
  })

  test('the crop of a renderer framing draws the same image', () => {
    // Fill's layout of the 400 × 300 image: scale 0.5, moved up 25 px.
    const local = Matrix.multiply(Matrix.translated(0, -25), Matrix.scaled(0.5, 0.5))
    const t = imageTransformFromLocalMatrix(local, 200, 100, 400, 300)
    if (!t) throw new Error('expected a transform')
    closeQuad(quad(t, 200, 100), quad(COVER, 200, 100))
  })

  test('cropping keeps the image where it was', () => {
    const rect = { x: 50, y: 10, width: 100, height: 60 }
    const cropped = croppedImageTransform(COVER, 200, 100, rect)
    const before = quad(COVER, 200, 100)
    // The new layer starts at the rect's corner, so the image sits that much further up and left.
    const shift = (point: Vector) => ({ x: point.x - rect.x, y: point.y - rect.y })
    closeQuad(quad(cropped, rect.width, rect.height), [
      shift(before[0]),
      shift(before[1]),
      shift(before[2]),
      shift(before[3])
    ])
  })

  test('moving the image stops at the layer edges while it covers the layer', () => {
    const moved = quad(pannedImageTransform(COVER, 200, 100, { x: 0, y: 10 }), 200, 100)
    expect(moved[0].y).toBeCloseTo(-15, 6)
    const clamped = quad(pannedImageTransform(COVER, 200, 100, { x: 40, y: 100 }), 200, 100)
    // Already flush left and right, and only 25 px to spare above.
    expect(clamped[0].x).toBeCloseTo(0, 6)
    expect(clamped[0].y).toBeCloseTo(0, 6)
  })

  test('scaling an image corner keeps its proportions about the opposite corner', () => {
    const grown = quad(scaledImageTransform(COVER, 200, 100, 2, { x: 300, y: 200 }, {}), 200, 100)
    close(grown[0], { x: 0, y: -25 })
    const width = grown[1].x - grown[0].x
    const height = grown[3].y - grown[0].y
    expect(width / height).toBeCloseTo(4 / 3, 6)
    expect(width).toBeGreaterThan(200)
  })

  test('an image covering the layer cannot shrink to leave it bare', () => {
    const shrunk = quad(scaledImageTransform(COVER, 200, 100, 2, { x: 20, y: 10 }, {}), 200, 100)
    expect(shrunk[2].x).toBeGreaterThanOrEqual(200 - 1e-6)
    expect(shrunk[2].y).toBeGreaterThanOrEqual(100 - 1e-6)
  })

  test('Alt scales the image about its centre', () => {
    const scaled = quad(
      scaledImageTransform(COVER, 200, 100, 2, { x: 300, y: 200 }, { fromCenter: true }),
      200,
      100
    )
    const center = { x: (scaled[0].x + scaled[2].x) / 2, y: (scaled[0].y + scaled[2].y) / 2 }
    close(center, { x: 100, y: 50 })
  })
})

describe('crop handles', () => {
  test('a side handle moves only its edge', () => {
    closeRect(resizedCropRect('e', 200, 100, { x: 150, y: 999 }), {
      x: 0,
      y: 0,
      width: 150,
      height: 100
    })
    closeRect(resizedCropRect('n', 200, 100, { x: -50, y: 30 }), {
      x: 0,
      y: 30,
      width: 200,
      height: 70
    })
  })

  test('a crop stays inside the image and never turns inside out', () => {
    const limit = { x: 0, y: -25, width: 200, height: 150 }
    closeRect(resizedCropRect('nw', 200, 100, { x: -40, y: -80 }, { limit }), {
      x: 0,
      y: -25,
      width: 200,
      height: 125
    })
    expect(resizedCropRect('w', 200, 100, { x: 500, y: 0 }).width).toBe(1)
  })

  test('Shift keeps the proportions and Alt crops both sides alike', () => {
    closeRect(resizedCropRect('se', 200, 100, { x: 100, y: 90 }, { keepRatio: true }), {
      x: 0,
      y: 0,
      width: 180,
      height: 90
    })
    closeRect(resizedCropRect('e', 200, 100, { x: 180, y: 50 }, { fromCenter: true }), {
      x: 20,
      y: 0,
      width: 160,
      height: 100
    })
  })
})

describe('image crop hit testing', () => {
  const identity = (point: Vector) => point
  const layout = imageCropLayout(COVER, 200, 100, true, identity)
  if (!layout) throw new Error('expected a layout')

  test('crop corners come first, then image corners, edges, and the image', () => {
    expect(hitTestImageCrop(layout, { x: 2, y: 3 })).toEqual({ kind: 'crop', handle: 'nw' })
    expect(hitTestImageCrop(layout, { x: 198, y: 124 })).toEqual({ kind: 'scale', corner: 2 })
    expect(hitTestImageCrop(layout, { x: 100, y: 98 })).toEqual({ kind: 'crop', handle: 's' })
    expect(hitTestImageCrop(layout, { x: 60, y: 40 })).toEqual({ kind: 'pan' })
    expect(hitTestImageCrop(layout, { x: 100, y: -15 })).toEqual({ kind: 'pan' })
    expect(hitTestImageCrop(layout, { x: 400, y: 40 })).toBeNull()
  })

  test('a layer that cannot crop offers only reframing', () => {
    const reframe = imageCropLayout(COVER, 200, 100, false, identity)
    if (!reframe) throw new Error('expected a layout')
    expect(hitTestImageCrop(reframe, { x: 2, y: 3 })).toEqual({ kind: 'pan' })
    expect(hitTestImageCrop(reframe, { x: 1, y: -24 })).toEqual({ kind: 'scale', corner: 0 })
  })
})
