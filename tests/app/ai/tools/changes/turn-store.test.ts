import { afterEach, expect, test } from 'bun:test'

import {
  clearTurnRenders,
  freeTurnRenders,
  freeTurnRendersOf,
  readTurnRenders,
  setTurnRenders,
  type TurnRenders
} from '@/app/ai/tools/changes/turn-store'

const owner = { onDispose: () => () => undefined }
const other = { onDispose: () => () => undefined }
const id = (index: number) => `reply-${index}`

function cleared(): TurnRenders {
  return {
    status: 'cleared',
    frames: [{ frameId: '12:1', pageId: '0:1', name: 'Hero' }],
    changed: 1
  }
}

afterEach(() => {
  for (let index = 0; index <= 10; index++) freeTurnRenders(id(index))
})

test('keeps at most eight cards alive, newest last', () => {
  for (let index = 0; index <= 8; index++) setTurnRenders(owner, id(index), cleared())

  // Other test files may hold cards of their own in the same process, so count ours.
  const alive = Array.from({ length: 9 }, (_, index) => readTurnRenders(id(index))).filter(
    (record) => record !== null
  )
  expect(alive).toHaveLength(8)
  expect(readTurnRenders(id(8))).not.toBeNull()
})

test('frees one card and leaves the others', () => {
  setTurnRenders(owner, id(1), cleared())
  setTurnRenders(owner, id(2), cleared())

  freeTurnRenders(id(1))

  expect(readTurnRenders(id(1))).toBeNull()
  expect(readTurnRenders(id(2))).not.toBeNull()
})

test('frees only the closing document’s cards', () => {
  setTurnRenders(owner, id(1), cleared())
  setTurnRenders(other, id(2), cleared())

  freeTurnRendersOf(owner)

  expect(readTurnRenders(id(1))).toBeNull()
  expect(readTurnRenders(id(2))).not.toBeNull()
})

test('frees a closing document’s cards even when no render queue subscribed', () => {
  const captured: { listener?: () => void } = {}
  const storeLike = {
    onDispose: (listener: () => void) => {
      captured.listener = listener
      return () => undefined
    }
  }

  setTurnRenders(storeLike, id(3), cleared())
  expect(readTurnRenders(id(3))).not.toBeNull()

  captured.listener?.()

  expect(readTurnRenders(id(3))).toBeNull()
})

test('clears a ready card’s images and keeps what it counted', () => {
  setTurnRenders(owner, id(1), {
    status: 'ready',
    changed: 3,
    frames: [
      {
        frameId: '12:1',
        pageId: '0:1',
        name: 'Hero',
        before: new Blob([new Uint8Array([1])]),
        after: new Blob([new Uint8Array([2])]),
        widths: [],
        created: false,
        deleted: false
      }
    ]
  })

  clearTurnRenders(id(1))

  expect(readTurnRenders(id(1))).toEqual({
    status: 'cleared',
    changed: 3,
    frames: [{ frameId: '12:1', pageId: '0:1', name: 'Hero' }]
  })
})
