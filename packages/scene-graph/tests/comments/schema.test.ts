import { expect, test } from 'bun:test'

import * as v from 'valibot'

import { commentThreadsSchema } from '@pairdraw/scene-graph/comments'
import type { CommentRegion } from '@pairdraw/scene-graph'

const base = {
  id: 'c_1',
  pageId: '0:1',
  x: 10,
  y: 20,
  author: 'Ada',
  text: 'contrast',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z'
}

const region: CommentRegion = {
  points: [
    [0, 0],
    [30, 4],
    [28, 30]
  ],
  width: 2,
  bounds: { minX: -1, minY: -1, maxX: 31, maxY: 31 }
}

test('a thread keeps the region it was drawn with', () => {
  const [thread] = v.parse(commentThreadsSchema, [{ ...base, region }])
  expect(thread?.region).toEqual(region)
})

test('a broken region is dropped and its note kept', () => {
  const broken = [
    { ...base, id: 'c_1', region: { ...region, points: [[0, 0]] } },
    { ...base, id: 'c_2', region: { ...region, width: Number.NaN } },
    { ...base, id: 'c_3', region: 'ring' }
  ]
  const threads = v.parse(commentThreadsSchema, broken)
  expect(threads.map((thread) => [thread.id, thread.region])).toEqual([
    ['c_1', undefined],
    ['c_2', undefined],
    ['c_3', undefined]
  ])
})

test('a region too long to be a drawn stroke is dropped', () => {
  const points = Array.from({ length: 513 }, (_, index) => [index, index])
  const [thread] = v.parse(commentThreadsSchema, [{ ...base, region: { ...region, points } }])
  expect(thread?.region).toBeUndefined()
  expect(thread?.text).toBe('contrast')
})
