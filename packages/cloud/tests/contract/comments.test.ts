import { describe, expect, test } from 'bun:test'

import {
  decodeCommentRelayMessage,
  encodeCommentRelayMessage,
  isPublicProfileHandle,
  MAX_RELAYED_COMMENT_BYTES,
  MAX_RELAYED_COMMENT_THREADS,
  packCommentRelayMessages,
  readRoomCommentThread,
  writeRoomCommentThread
} from '#cloud/contract'
import * as Y from 'yjs'

import type { CommentThread } from '@pairdraw/scene-graph'

const thread: CommentThread = {
  id: 't1',
  pageId: '0:1',
  x: 1,
  y: 2,
  author: 'Ada',
  text: 'Hello',
  createdAt: '2026-11-03T10:00:00.000Z',
  updatedAt: '2026-11-03T10:00:00.000Z',
  resolved: false,
  replies: [{ id: 'r1', author: 'Grace', text: 'Hi', createdAt: '2026-11-03T10:01:00.000Z' }]
}

describe('comment channel contract', () => {
  test('round-trips threads and refuses anything else', () => {
    expect(decodeCommentRelayMessage(encodeCommentRelayMessage([thread]))).toMatchObject([
      { id: 't1', author: 'Ada', text: 'Hello', replies: [{ id: 'r1', text: 'Hi' }] }
    ])
    expect(decodeCommentRelayMessage(new TextEncoder().encode('{"threads":[]}'))).toBeNull()
    expect(decodeCommentRelayMessage(new Uint8Array([0xff, 0xfe]))).toBeNull()
    const many = Array.from({ length: MAX_RELAYED_COMMENT_THREADS + 1 }, () => thread)
    expect(decodeCommentRelayMessage(encodeCommentRelayMessage(many))).toBeNull()
  })

  test('packs threads into messages within the thread and byte limits', () => {
    const many = Array.from({ length: MAX_RELAYED_COMMENT_THREADS * 2 + 1 }, (_, index) => ({
      ...thread,
      id: `t${index}`
    }))
    const byCount = packCommentRelayMessages(many)
    expect(byCount.messages.map((message) => decodeCommentRelayMessage(message)?.length)).toEqual([
      MAX_RELAYED_COMMENT_THREADS,
      MAX_RELAYED_COMMENT_THREADS,
      1
    ])

    // Ten threads of about a fifth of the limit each take three messages, each under the limit.
    const long = 'x'.repeat(Math.floor(MAX_RELAYED_COMMENT_BYTES / 5) - 400)
    const large = Array.from({ length: 10 }, (_, index) => ({
      ...thread,
      id: `l${index}`,
      text: long.slice(0, 9_000),
      replies: Array.from({ length: 5 }, (__, reply) => ({
        id: `r${reply}`,
        author: 'Grace',
        text: long.slice(0, (long.length - 9_000) / 5),
        createdAt: '2026-11-03T10:01:00.000Z'
      }))
    }))
    const byBytes = packCommentRelayMessages(large)
    expect(byBytes.oversized).toEqual([])
    expect(byBytes.messages.length).toBeGreaterThan(1)
    for (const message of byBytes.messages) {
      expect(message.byteLength).toBeLessThanOrEqual(MAX_RELAYED_COMMENT_BYTES)
    }
    expect(byBytes.messages.flatMap((message) => decodeCommentRelayMessage(message) ?? [])).toEqual(
      large
    )

    const huge = { ...thread, id: 'huge', replies: large.flatMap((entry) => entry.replies) }
    expect(packCommentRelayMessages([huge, thread])).toEqual({
      messages: [encodeCommentRelayMessage([thread])],
      oversized: [huge]
    })
  })

  test('writes threads in the room layout editors read, replies keyed by ID', () => {
    const document = new Y.Doc()
    const threads = document.getMap<unknown>('commentThreads')
    writeRoomCommentThread(threads, thread)
    expect(threads.toJSON()).toMatchObject({
      t1: { text: 'Hello', replies: { r1: { text: 'Hi' } } }
    })
    expect(readRoomCommentThread(threads, 't1')).toMatchObject({
      id: 't1',
      text: 'Hello',
      replies: [{ id: 'r1', text: 'Hi' }]
    })
    expect(readRoomCommentThread(threads, 'missing')).toBeNull()
  })

  test('accepts handles of lowercase letters, digits, and inner dashes', () => {
    for (const handle of ['ada', 'ada-studio', 'a1b'])
      expect(isPublicProfileHandle(handle)).toBe(true)
    for (const handle of ['ab', '-ada', 'ada-', 'Ada', 'a b', 'x'.repeat(33)]) {
      expect(isPublicProfileHandle(handle)).toBe(false)
    }
  })
})
