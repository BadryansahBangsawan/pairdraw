import { expect, test } from 'bun:test'

import type { Vector } from '@pairdraw/scene-graph/primitives'

import {
  liveStrokeBox,
  regionCanvasBounds,
  regionStrokeBox,
  simplifyStroke,
  strokeMaskURL,
  strokeToComment
} from '@/app/comments/region'

const at = (x: number, y: number): Vector => ({ x, y })

/** Points along a line: a stroke that says nothing new after its ends. */
const line = (count: number): Vector[] =>
  Array.from({ length: count }, (_, index) => at(index, index * 0.5))

test('simplifying a stroke keeps its ends and drops the points on a straight line', () => {
  expect(simplifyStroke(line(40), 1, 128)).toEqual([at(0, 0), at(39, 19.5)])
})

test('a stroke longer than the cap is simplified until it fits, ends kept', () => {
  // A sawtooth: every point is a corner, so only a wider tolerance brings it under the cap.
  const teeth = Array.from({ length: 300 }, (_, index) => at(index, index % 2 === 0 ? 0 : 8))
  const simplified = simplifyStroke(teeth, 0.5, 32)
  expect(simplified.length).toBeLessThanOrEqual(32)
  expect(simplified[0]).toEqual(at(0, 0))
  expect(simplified.at(-1)).toEqual(at(299, 8))
})

test('a drawn stroke becomes a region whose pin sits at its top-left corner', () => {
  const drawn = strokeToComment([at(0, 0), at(100, 0), at(100, 50)], 1)
  expect(drawn).toEqual({
    at: at(-1, -1),
    region: {
      points: [
        [1, 1],
        [101, 1],
        [101, 51]
      ],
      width: 2,
      bounds: { minX: 0, minY: 0, maxX: 102, maxY: 52 }
    }
  })
})

test('a stroke smaller than a dot makes no region', () => {
  expect(strokeToComment([at(5, 5)], 1)).toBeNull()
  expect(strokeToComment([at(5, 5), at(5, 5)], 1)).toBeNull()
})

test('a region draws in a box at the pin, scaled by zoom', () => {
  const region = {
    points: [
      [1, 1],
      [2, 3]
    ] as [number, number][],
    width: 2,
    bounds: { minX: 0, minY: 0, maxX: 3, maxY: 4 }
  }
  expect(regionStrokeBox(region, at(10, 20), 2)).toEqual({
    left: 20,
    top: 40,
    width: 6,
    height: 8,
    d: 'M2 2 L4 6',
    stroke: 4
  })
})

test('a stroke still being drawn gets a box around its points', () => {
  expect(liveStrokeBox([at(0, 0), at(10, 5)], 2)).toEqual({
    left: -1,
    top: -1,
    width: 22,
    height: 12,
    d: 'M1 1 L21 11',
    stroke: 2
  })
})

test('a stroke becomes a mask of its box, with the path inside it', () => {
  const url = strokeMaskURL({
    left: 0,
    top: 0,
    width: 40,
    height: 20,
    d: 'M1 1 L39 19',
    stroke: 2
  })
  expect(url).toStartWith('url("data:image/svg+xml,')
  const svg = decodeURIComponent(url.slice(22, -2))
  expect(svg).toContain('width="40" height="20"')
  expect(svg).toContain('d="M1 1 L39 19"')
  expect(svg).toContain('stroke-width="2"')
})

test('a region’s canvas bounds are its pin plus its box', () => {
  const region = {
    points: [
      [0, 0],
      [5, 5]
    ] as [number, number][],
    width: 1,
    bounds: { minX: 0, minY: 0, maxX: 6, maxY: 7 }
  }
  expect(regionCanvasBounds(region, at(100, 200))).toEqual({
    minX: 100,
    minY: 200,
    maxX: 106,
    maxY: 207
  })
})
