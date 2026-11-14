import { isEqual, omitBy } from 'es-toolkit'
import * as v from 'valibot'
import * as Y from 'yjs'

import type { CommentReply, CommentThread } from '@pairdraw/scene-graph'
import { commentThreadsSchema } from '@pairdraw/scene-graph/comments'

import { RELAY_MINIMUM_MESSAGE_BYTES } from './relay'

/**
 * The room map that holds a document's comment threads by ID. Each thread is a map of its fields,
 * and its `replies` field a map of replies by ID, so people commenting at once all keep theirs.
 */
export const ROOM_COMMENT_THREADS = 'commentThreads'

/** The most threads one message on the comment channel may carry. */
export const MAX_RELAYED_COMMENT_THREADS = 20
/**
 * The most bytes one message on the comment channel carries: well under the smallest message
 * limit a relay may set, with room for framing, so a commenter's message never closes its socket.
 */
export const MAX_RELAYED_COMMENT_BYTES = RELAY_MINIMUM_MESSAGE_BYTES - 64 * 1024
/** The longest comment or reply the relay writes for a commenter, in characters. */
export const MAX_RELAYED_COMMENT_TEXT = 10_000
/** The most replies a thread a commenter sends may hold. */
export const MAX_RELAYED_COMMENT_REPLIES = 500

const commentRelayMessageSchema = v.object({
  threads: v.pipe(
    v.array(v.unknown()),
    v.minLength(1),
    v.maxLength(MAX_RELAYED_COMMENT_THREADS),
    v.transform((items): CommentThread[] => {
      // Threads that cannot be read are left out, as files and rooms leave them out.
      const parsed = v.safeParse(commentThreadsSchema, items)
      return parsed.success ? parsed.output : []
    })
  )
})

/** A commenter's changed threads, as it sends them on the relay's comment channel. */
export function encodeCommentRelayMessage(threads: readonly CommentThread[]): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ threads }))
}

/** Bytes `encodeCommentRelayMessage` adds around its threads: `{"threads":[` and `]}`. */
const COMMENT_MESSAGE_FRAMING_BYTES = encodeCommentRelayMessage([]).byteLength

/**
 * Packs threads into as few comment channel messages as fit `MAX_RELAYED_COMMENT_THREADS` and
 * `MAX_RELAYED_COMMENT_BYTES`. A thread too large for a message of its own cannot be sent; it is
 * returned in `oversized` instead.
 */
export function packCommentRelayMessages(threads: readonly CommentThread[]): {
  messages: Uint8Array[]
  oversized: CommentThread[]
} {
  const encoder = new TextEncoder()
  const messages: Uint8Array[] = []
  const oversized: CommentThread[] = []
  let batch: CommentThread[] = []
  let bytes = COMMENT_MESSAGE_FRAMING_BYTES
  const flush = () => {
    if (batch.length > 0) messages.push(encodeCommentRelayMessage(batch))
    batch = []
    bytes = COMMENT_MESSAGE_FRAMING_BYTES
  }
  for (const thread of threads) {
    const size = encoder.encode(JSON.stringify(thread)).byteLength
    if (COMMENT_MESSAGE_FRAMING_BYTES + size > MAX_RELAYED_COMMENT_BYTES) {
      oversized.push(thread)
      continue
    }
    // Threads after the first are separated by a comma.
    const added = size + (batch.length > 0 ? 1 : 0)
    if (batch.length >= MAX_RELAYED_COMMENT_THREADS || bytes + added > MAX_RELAYED_COMMENT_BYTES) {
      flush()
      bytes += size
    } else {
      bytes += added
    }
    batch.push(thread)
  }
  flush()
  return { messages, oversized }
}

/** The threads a comment channel message carries, or null when it is not one. */
export function decodeCommentRelayMessage(data: Uint8Array): CommentThread[] | null {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(data)
  } catch {
    return null
  }
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), commentRelayMessageSchema), text)
  return parsed.success ? parsed.output.threads : null
}

function byCreatedAt(first: CommentReply, second: CommentReply): number {
  return first.createdAt.localeCompare(second.createdAt)
}

/** A thread as the room holds it, read as files are; null when there is none or it is unreadable. */
export function readRoomCommentThread(threads: Y.Map<unknown>, id: string): CommentThread | null {
  const record = threads.get(id)
  if (!(record instanceof Y.Map)) return null
  const json: unknown = record.toJSON()
  if (typeof json !== 'object' || json === null) return null
  const replies: unknown = Reflect.get(json, 'replies')
  const listed =
    typeof replies === 'object' && replies !== null ? Object.values(replies) : ([] as unknown[])
  const parsed = v.safeParse(commentThreadsSchema, [{ ...json, replies: listed }])
  const thread = parsed.success ? parsed.output[0] : undefined
  return thread ? { ...thread, replies: thread.replies.toSorted(byCreatedAt) } : null
}

/**
 * Writes a thread into the room in the layout editors write it: its fields one by one, and its
 * replies keyed by ID, changing only what differs so a field another peer changed keeps its change.
 */
export function writeRoomCommentThread(threads: Y.Map<unknown>, thread: CommentThread): void {
  let record = threads.get(thread.id)
  if (!(record instanceof Y.Map)) {
    record = new Y.Map<unknown>()
    threads.set(thread.id, record)
  }
  const target = record as Y.Map<unknown>
  const { replies, ...fields } = thread
  const entries = new Map<string, unknown>(Object.entries(fields))
  for (const key of Array.from(target.keys())) {
    if (key !== 'replies' && !entries.has(key)) target.delete(key)
  }
  for (const [key, value] of entries) {
    if (value === undefined) {
      if (target.has(key)) target.delete(key)
    } else if (!isEqual(target.get(key), value)) target.set(key, structuredClone(value))
  }
  let byId = target.get('replies')
  if (!(byId instanceof Y.Map)) {
    byId = new Y.Map<unknown>()
    target.set('replies', byId)
  }
  const replyMap = byId as Y.Map<unknown>
  for (const reply of replies) {
    const value = omitBy(reply, (field) => field === undefined)
    if (!isEqual(replyMap.get(reply.id), value)) replyMap.set(reply.id, structuredClone(value))
  }
}
