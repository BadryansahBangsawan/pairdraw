import {
  MAX_RELAYED_COMMENT_REPLIES,
  MAX_RELAYED_COMMENT_TEXT,
  readRoomCommentThread
} from '#cloud/contract'
import type * as Y from 'yjs'

import type { CommentReply, CommentThread } from '@pairdraw/scene-graph'

function fits(thread: CommentThread): boolean {
  return (
    thread.text.length <= MAX_RELAYED_COMMENT_TEXT &&
    thread.replies.length <= MAX_RELAYED_COMMENT_REPLIES &&
    thread.replies.every((reply) => reply.text.length <= MAX_RELAYED_COMMENT_TEXT)
  )
}

/** Who wrote a relayed comment and when, as the relay saw it, never as the commenter said. */
interface CommentStamp {
  author: string
  now: string
}

function stampedReply(reply: CommentReply, stamp: CommentStamp): CommentReply {
  return {
    ...reply,
    author: stamp.author,
    authorColor: undefined,
    createdAt: stamp.now,
    deleted: undefined
  }
}

/**
 * What a commenter's threads may change in the room, as the threads to write. A commenter starts
 * threads and replies to any thread, and resolves or reopens threads, as Figma lets people who
 * can comment. What the relay writes carries the name on the commenter's ticket, an account's
 * name or the name a guest chose, and the relay's own clock, so a commenter cannot date a change
 * ahead to win later merges or back to sort first. Everything else a commenter sends about a
 * thread that already exists, such as editing or deleting it or anyone's reply, is left as the
 * room holds it, since names do not prove who wrote a comment.
 */
export function commenterThreadWrites(
  threads: Y.Map<unknown>,
  incoming: readonly CommentThread[],
  author: string,
  now: string = new Date().toISOString()
): CommentThread[] {
  const stamp: CommentStamp = { author, now }
  const writes: CommentThread[] = []
  for (const thread of incoming) {
    if (!fits(thread)) continue
    const existing = readRoomCommentThread(threads, thread.id)
    if (!existing) {
      // Someone else's deleted thread stays a tombstone; a new one starts undeleted.
      if (threads.has(thread.id)) continue
      writes.push({
        ...thread,
        author,
        authorColor: undefined,
        createdAt: now,
        updatedAt: now,
        resolvedAt: thread.resolved ? now : undefined,
        deleted: undefined,
        replies: thread.replies.map((reply) => stampedReply(reply, stamp))
      })
      continue
    }
    if (existing.deleted) continue
    const known = new Set(existing.replies.map((reply) => reply.id))
    const added = thread.replies
      .filter((reply) => !known.has(reply.id))
      .map((reply) => stampedReply(reply, stamp))
    if (existing.replies.length + added.length > MAX_RELAYED_COMMENT_REPLIES) continue
    const resolving = thread.resolved !== existing.resolved
    if (added.length === 0 && !resolving) continue
    writes.push({
      ...existing,
      resolved: thread.resolved,
      resolvedAt: resolving ? (thread.resolved ? now : null) : existing.resolvedAt,
      updatedAt: now,
      replies: [...existing.replies, ...added]
    })
  }
  return writes
}
