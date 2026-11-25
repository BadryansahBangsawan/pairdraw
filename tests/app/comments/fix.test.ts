import { expect, test } from 'bun:test'

import type { CommentRegion } from '@pairdraw/scene-graph'

import { regionCrop } from '@/app/comments/fix'

const region = (width: number, height: number): CommentRegion => ({
  points: [
    [0, 0],
    [width, 0],
    [width, height]
  ],
  width: 2,
  bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
})

test('a region’s crop is its box plus a margin, cropped at full size when it is small', () => {
  expect(regionCrop(region(40, 20), { x: 100, y: 200 })).toEqual({
    bounds: { minX: 84, minY: 184, maxX: 156, maxY: 236 },
    scale: 1
  })
})

test('a wide region is cropped smaller so its longest edge stays within the attachment limit', () => {
  const crop = regionCrop(region(4000, 100), { x: 0, y: 0 })
  expect(crop?.bounds).toEqual({ minX: -16, minY: -16, maxX: 4016, maxY: 116 })
  expect(crop?.scale).toBeCloseTo(768 / 4032, 6)
})
