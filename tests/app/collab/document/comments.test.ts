import { describe, expect, test } from 'bun:test'

import {
  COLLAB_ACTIONS,
  decodeCommentRelayMessage,
  RELAY_SERVER_PEER
} from '@pairdraw/cloud/contract'
import { SceneGraph, type CommentThread } from '@pairdraw/scene-graph'
import { readComments, writeComments } from '@pairdraw/scene-graph/comments'

import { openRoomSession, type RoomSession } from '@/app/collab/session'
import type { JoinCollabRoom } from '@/app/collab/transport'
import { createEditorStore } from '@/app/editor/session'

import { createMemoryRooms } from '#tests/helpers/collab/memory-transport'

const ROOM = 'cccccccccccccccccccccccccccccccc'
const noSavedCopy = () => ({ whenSynced: Promise.resolve(), destroy: () => undefined })

function thread(id: string): CommentThread {
  return {
    id,
    pageId: '0:1',
    x: 0,
    y: 0,
    author: 'Grace',
    text: 'Looks good',
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    resolved: false,
    replies: []
  }
}

/** The memory rooms, with what each peer sent on the comment channel and to whom. */
function recordingRooms() {
  const rooms = createMemoryRooms()
  const comments: { to: string | undefined; threads: CommentThread[] | null }[] = []
  const join: JoinCollabRoom = (roomId) => {
    const transport = rooms.join(roomId)
    return {
      ...transport,
      makeAction(namespace) {
        const [send, receive] = transport.makeAction(namespace)
        if (namespace !== COLLAB_ACTIONS.comments) return [send, receive]
        return [
          (data, peerId) => {
            comments.push({ to: peerId, threads: decodeCommentRelayMessage(data) })
            send(data, peerId)
          },
          receive
        ]
      }
    }
  }
  return { join, settle: rooms.settle, comments }
}

describe('commenting in a room', () => {
  test('a commenter sends its new thread to the relay and writes nothing to the room', async () => {
    const rooms = recordingRooms()
    const host = createEditorStore(new SceneGraph())
    const commenter = createEditorStore(new SceneGraph())
    const sessions: RoomSession[] = []
    try {
      const shared = openRoomSession({
        roomId: ROOM,
        store: host,
        origin: 'shared',
        joinRoom: rooms.join,
        openSavedCopy: noSavedCopy
      })
      sessions.push(shared)
      shared.shareDocument()
      commenter.setReadOnly(true, { comments: true })
      sessions.push(
        openRoomSession({
          roomId: ROOM,
          store: commenter,
          origin: 'joined',
          joinRoom: rooms.join,
          openSavedCopy: noSavedCopy,
          commentRelay: true
        })
      )
      await rooms.settle()

      writeComments(commenter.graph, [...readComments(commenter.graph), thread('t1')])
      await rooms.settle()

      expect(rooms.comments).toEqual([
        {
          to: RELAY_SERVER_PEER,
          threads: [expect.objectContaining({ id: 't1', text: 'Looks good' })]
        }
      ])
      // Only the relay writes a commenter's comments into the room.
      expect(readComments(host.graph)).toEqual([])
    } finally {
      for (const session of sessions) session.dispose()
      host.preparationController.dispose()
      commenter.preparationController.dispose()
    }
  })

  test('a reply to a thread the room has goes alone, without the thread’s other replies', async () => {
    const rooms = recordingRooms()
    const host = createEditorStore(new SceneGraph())
    const commenter = createEditorStore(new SceneGraph())
    const sessions: RoomSession[] = []
    const reply = (id: string, text: string) => ({
      id,
      author: 'Grace',
      text,
      createdAt: `2026-11-03T10:0${id.slice(1)}:00.000Z`
    })
    try {
      const shared = openRoomSession({
        roomId: ROOM,
        store: host,
        origin: 'shared',
        joinRoom: rooms.join,
        openSavedCopy: noSavedCopy
      })
      sessions.push(shared)
      writeComments(host.graph, [
        { ...thread('t1'), replies: [reply('r1', 'One'), reply('r2', 'Two')] }
      ])
      shared.shareDocument()
      commenter.setReadOnly(true, { comments: true })
      sessions.push(
        openRoomSession({
          roomId: ROOM,
          store: commenter,
          origin: 'joined',
          joinRoom: rooms.join,
          openSavedCopy: noSavedCopy,
          commentRelay: true
        })
      )
      await rooms.settle()
      const [held] = readComments(commenter.graph)
      if (!held) throw new Error('The commenter never received the thread')

      writeComments(commenter.graph, [
        { ...held, resolved: true, replies: [...held.replies, reply('r3', 'Three')] }
      ])
      await rooms.settle()

      expect(rooms.comments).toEqual([
        {
          to: RELAY_SERVER_PEER,
          threads: [
            expect.objectContaining({ id: 't1', resolved: true, replies: [reply('r3', 'Three')] })
          ]
        }
      ])
    } finally {
      for (const session of sessions) session.dispose()
      host.preparationController.dispose()
      commenter.preparationController.dispose()
    }
  })
})
