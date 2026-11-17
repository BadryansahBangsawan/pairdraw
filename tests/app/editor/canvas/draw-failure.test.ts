import 'fake-indexeddb/auto'
import { beforeEach, expect, test } from 'bun:test'

import { diagnostics } from '@/app/diagnostics'
import { reportCanvasDrawFailure } from '@/app/editor/canvas/draw-failure'

beforeEach(async () => {
  await diagnostics.clear()
})

test('records one skipped layer per id when the message is the same', async () => {
  const error = new TypeError("undefined is not an object (evaluating 'effect.color.r')")
  reportCanvasDrawFailure('node-a', error)
  reportCanvasDrawFailure('node-b', error)

  const events = await diagnostics.list()
  expect(events.map((event) => event.attributes.source)).toEqual(['canvas', 'canvas'])
  expect(events.map((event) => String(event.attributes.info)).toSorted()).toEqual([
    'node-a',
    'node-b'
  ])
})
