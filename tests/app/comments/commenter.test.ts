import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import type { CommentThread } from '@open-pencil/scene-graph'
import { readComments, writeComments } from '@open-pencil/scene-graph/comments'

import { useComments } from '@/app/comments/use'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session/create'

const stores: ReturnType<typeof createEditorStore>[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

function thread(pageId: string): CommentThread {
  return {
    id: 'kept',
    pageId,
    x: 0,
    y: 0,
    author: 'Ada',
    text: 'Keep me',
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    resolved: false,
    replies: [
      {
        id: 'reply',
        author: 'Ada',
        text: 'And me',
        createdAt: '2026-11-03T10:00:00.000Z'
      }
    ]
  }
}

/** A document someone may only comment on, as a Cloud comment link opens it. */
function openForCommenting() {
  const store = createEditorStore()
  stores.push(store)
  writeComments(store.graph, [thread(store.state.currentPageId)])
  store.setReadOnly(true, { comments: true })
  setActiveEditorStore(store)
  return store
}

test('someone who can only comment cannot delete, delete replies, or move pins', () => {
  const store = openForCommenting()
  const comments = useComments()
  expect(comments.commentsOnly.value).toBe(true)

  let asked = false
  const stop = comments.onDeleteRequested(() => {
    asked = true
  })
  comments.requestDelete('kept')
  comments.confirmDelete('kept')
  comments.deleteReply('kept', 'reply')
  comments.movePin('kept', { x: 500, y: 500 })
  stop.off()

  expect(asked).toBe(false)
  expect(readComments(store.graph)).toEqual([thread(store.state.currentPageId)])
})

test('someone who can only comment still replies and resolves', () => {
  const store = openForCommenting()
  const comments = useComments()
  comments.reply('kept', 'Agreed')
  comments.setResolved('kept', true)

  const [saved] = readComments(store.graph)
  expect(saved?.resolved).toBe(true)
  expect(saved?.replies.map((reply) => reply.text)).toEqual(['And me', 'Agreed'])
})

test('an editable document keeps deleting and moving comments', () => {
  const store = createEditorStore()
  stores.push(store)
  writeComments(store.graph, [thread(store.state.currentPageId)])
  setActiveEditorStore(store)
  const comments = useComments()
  expect(comments.commentsOnly.value).toBe(false)

  comments.deleteReply('kept', 'reply')
  comments.confirmDelete('kept')
  expect(readComments(store.graph)[0]?.deleted).toBe(true)
})
