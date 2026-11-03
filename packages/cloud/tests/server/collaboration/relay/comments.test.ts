import { describe, expect, test } from 'bun:test'

import { guest, joinTestRelay, startTestRelay, user } from '#cloud-tests/helpers/relay'
import {
  COLLAB_ACTIONS,
  decodeRoomUpdate,
  encodeCommentRelayMessage,
  MAX_COLLAB_MESSAGE_BYTES,
  readRoomCommentThread,
  RELAY_CLOSE,
  RELAY_SERVER_PEER,
  ROOM_COMMENT_THREADS,
  writeRoomCommentThread
} from '#cloud/contract'
import type { CollaborationRelay } from '#cloud/server'
import * as Y from 'yjs'

import type { CommentThread } from '@open-pencil/scene-graph'

const documentId = crypto.randomUUID()

function thread(id: string, overrides: Partial<CommentThread> = {}): CommentThread {
  return {
    id,
    pageId: '0:1',
    x: 10,
    y: 20,
    author: 'Someone else',
    text: 'Tighten the spacing',
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    resolved: false,
    replies: [],
    ...overrides
  }
}

type Client = Awaited<ReturnType<typeof joinTestRelay>>

/** The room's comment threads as a newcomer receives them from the relay. */
async function roomThreads(hub: CollaborationRelay): Promise<Y.Map<unknown>> {
  const newcomer = await joinTestRelay(hub, documentId, { permission: 'view' })
  newcomer.send({
    type: 'message',
    namespace: COLLAB_ACTIONS.syncStep1,
    target: RELAY_SERVER_PEER,
    payload: Y.encodeStateVector(new Y.Doc())
  })
  const document = new Y.Doc()
  const [reply] = newcomer.messages(COLLAB_ACTIONS.syncReply)
  const update = decodeRoomUpdate(reply?.payload ?? new Uint8Array(), {
    limit: MAX_COLLAB_MESSAGE_BYTES,
    compressed: true
  })
  if (update) Y.applyUpdateV2(document, update)
  return document.getMap(ROOM_COMMENT_THREADS)
}

/** What the relay sent everyone in the room as its own updates. */
function serverUpdates(client: Client) {
  return client
    .messages(COLLAB_ACTIONS.yjsUpdate)
    .filter((frame) => frame.from === RELAY_SERVER_PEER)
}

function sendComments(client: Client, threads: CommentThread[]) {
  client.send({
    type: 'message',
    namespace: COLLAB_ACTIONS.comments,
    target: RELAY_SERVER_PEER,
    payload: encodeCommentRelayMessage(threads)
  })
}

/** An editor's room holding `existing`, written as editors write comment threads. */
async function roomWith(hub: CollaborationRelay, existing: CommentThread[]) {
  const editor = await joinTestRelay(hub, documentId)
  const document = new Y.Doc()
  const before = Y.encodeStateVector(document)
  for (const item of existing) writeRoomCommentThread(document.getMap(ROOM_COMMENT_THREADS), item)
  editor.send({
    type: 'message',
    namespace: COLLAB_ACTIONS.yjsUpdate,
    target: null,
    payload: Y.encodeStateAsUpdateV2(document, before)
  })
  return editor
}

describe('comment channel', () => {
  test('writes a commenter’s new thread under the name on its ticket', async () => {
    const { relay: hub } = startTestRelay()
    const editor = await roomWith(hub, [])
    const commenter = await joinTestRelay(hub, documentId, {
      permission: 'comment',
      principal: guest('visitor', 'Grace')
    })
    sendComments(commenter, [thread('t1', { author: 'Ada' })])

    const written = readRoomCommentThread(await roomThreads(hub), 't1')
    expect(written).toMatchObject({ id: 't1', author: 'Grace', text: 'Tighten the spacing' })
    // Everyone in the room, the commenter too, gets the change from the relay.
    expect(serverUpdates(editor)).toHaveLength(1)
    expect(serverUpdates(commenter)).toHaveLength(1)
    expect(commenter.closed).toBeNull()
  })

  test('adds replies and resolves, but edits and deletes nothing that exists', async () => {
    const { relay: hub } = startTestRelay()
    const existing = thread('t1', {
      replies: [
        {
          id: 'r1',
          author: 'Someone else',
          text: 'Agreed',
          createdAt: '2026-11-03T10:01:00.000Z'
        }
      ]
    })
    await roomWith(hub, [existing])
    const commenter = await joinTestRelay(hub, documentId, {
      permission: 'comment',
      principal: user('grace', 'Grace')
    })
    sendComments(commenter, [
      {
        ...existing,
        text: 'Rewritten',
        deleted: true,
        resolved: true,
        resolvedAt: '2026-11-03T11:00:00.000Z',
        updatedAt: '2026-11-03T11:00:00.000Z',
        replies: [
          { id: 'r1', author: 'Someone else', text: 'Nope', createdAt: '2026-11-03T10:01:00.000Z' },
          { id: 'r2', author: 'Someone else', text: 'Done', createdAt: '2026-11-03T11:00:00.000Z' }
        ]
      }
    ])

    const written = readRoomCommentThread(await roomThreads(hub), 't1')
    expect(written).toMatchObject({ text: 'Tighten the spacing', resolved: true })
    expect(written?.deleted).toBeUndefined()
    expect(written?.replies.map((reply) => [reply.id, reply.author, reply.text])).toEqual([
      ['r1', 'Someone else', 'Agreed'],
      ['r2', 'Grace', 'Done']
    ])
  })

  test('dates relayed comments by the relay’s clock, not the commenter’s', async () => {
    const { relay: hub } = startTestRelay()
    const existing = thread('t1')
    await roomWith(hub, [existing])
    const commenter = await joinTestRelay(hub, documentId, {
      permission: 'comment',
      principal: user('grace', 'Grace')
    })
    const future = '9999-01-01T00:00:00.000Z'
    const past = '2000-01-01T00:00:00.000Z'
    const before = new Date().toISOString()
    sendComments(commenter, [
      {
        ...existing,
        resolved: true,
        resolvedAt: future,
        updatedAt: future,
        replies: [{ id: 'r1', author: 'Grace', text: 'First!', createdAt: past }]
      },
      thread('t2', {
        createdAt: past,
        updatedAt: future,
        authorColor: { r: 1, g: 0, b: 0, a: 1 }
      })
    ])
    const after = new Date().toISOString()

    const room = await roomThreads(hub)
    const resolved = readRoomCommentThread(room, 't1')
    const started = readRoomCommentThread(room, 't2')
    for (const stamp of [
      resolved?.updatedAt,
      resolved?.resolvedAt,
      resolved?.replies[0]?.createdAt,
      started?.createdAt,
      started?.updatedAt
    ]) {
      expect(stamp && stamp >= before && stamp <= after).toBe(true)
    }
    expect(started?.authorColor).toBeUndefined()
  })

  test('drops comments from viewers and closes on malformed ones', async () => {
    const { relay: hub } = startTestRelay()
    const editor = await roomWith(hub, [])
    const viewer = await joinTestRelay(hub, documentId, { permission: 'view' })
    sendComments(viewer, [thread('t1')])
    expect(readRoomCommentThread(await roomThreads(hub), 't1')).toBeNull()

    const commenter = await joinTestRelay(hub, documentId, { permission: 'comment' })
    // A commenter's document writes never reach the room.
    const document = new Y.Doc()
    document.getText('t').insert(0, 'sneaky')
    commenter.send({
      type: 'message',
      namespace: COLLAB_ACTIONS.yjsUpdate,
      target: null,
      payload: Y.encodeStateAsUpdateV2(document)
    })
    expect(editor.messages(COLLAB_ACTIONS.yjsUpdate)).toHaveLength(0)
    commenter.send({
      type: 'message',
      namespace: COLLAB_ACTIONS.comments,
      target: RELAY_SERVER_PEER,
      payload: new TextEncoder().encode('{"threads":"nope"}')
    })
    expect(commenter.closed?.code).toBe(RELAY_CLOSE.protocol)
  })
})
