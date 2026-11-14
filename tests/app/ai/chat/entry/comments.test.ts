import { describe, expect, test } from 'bun:test'

import type { CommentThread } from '@pairdraw/scene-graph'
import { SceneGraph } from '@pairdraw/scene-graph'

import { commentThreadsPrompt, openCommentThreads } from '@/app/ai/chat/entry/comments'
import { findReferences } from '@/app/ai/chat/references/link'

function thread(overrides: Partial<CommentThread> & Pick<CommentThread, 'id'>): CommentThread {
  return {
    pageId: '0:1',
    x: 0,
    y: 0,
    author: 'Ana',
    text: 'Make the title bigger',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    resolved: false,
    replies: [],
    ...overrides
  }
}

describe('comment threads as prompts', () => {
  test('one thread asks to apply, reply and resolve, naming its ID, layer and messages', () => {
    const graph = new SceneGraph()
    const card = graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card' })
    const prompt =
      commentThreadsPrompt(graph, [
        thread({
          id: 'c-1',
          nodeId: card.id,
          text: 'Make the title bigger\nand bolder',
          replies: [
            {
              id: 'r-1',
              author: 'Ben',
              text: 'Agreed',
              createdAt: '2026-01-01T11:00:00.000Z'
            },
            {
              id: 'r-2',
              author: 'Ben',
              text: 'Never mind',
              createdAt: '2026-01-01T12:00:00.000Z',
              deleted: true
            }
          ]
        })
      ]) ?? ''

    expect(prompt).toStartWith(
      'Apply the feedback in this comment thread, then reply to it with what you changed and resolve it.'
    )
    expect(prompt).toContain('Thread c-1 on [Card](pairdraw://node/')
    expect(prompt).toContain('> **Ana:** Make the title bigger\n> and bolder\n>\n> **Ben:** Agreed')
    // Deleted replies stay out.
    expect(prompt).not.toContain('Never mind')
    expect(findReferences(prompt).map(({ reference }) => reference.id)).toEqual([card.id])
  })

  test('a thread whose layer is gone, or that has none, is named by its ID only', () => {
    const graph = new SceneGraph()
    const prompt = commentThreadsPrompt(graph, [thread({ id: 'c-2', nodeId: '9:9' })]) ?? ''
    expect(prompt).toContain('Thread c-2\n> **Ana:**')
    expect(findReferences(prompt)).toEqual([])
  })

  test('several threads go oldest first; resolved and deleted ones stay out', () => {
    const graph = new SceneGraph()
    const threads = [
      thread({ id: 'late', createdAt: '2026-01-03T00:00:00.000Z', text: 'Late' }),
      thread({ id: 'early', createdAt: '2026-01-02T00:00:00.000Z', text: 'Early' }),
      thread({ id: 'done', resolved: true, text: 'Done' }),
      thread({ id: 'gone', deleted: true, text: 'Gone' })
    ]

    expect(openCommentThreads(threads).map(({ id }) => id)).toEqual(['late', 'early'])
    const prompt = commentThreadsPrompt(graph, threads) ?? ''
    expect(prompt).toStartWith('Apply the feedback in these comment threads')
    expect(prompt.indexOf('Thread early')).toBeLessThan(prompt.indexOf('Thread late'))
    expect(prompt).not.toContain('Done')
    expect(prompt).not.toContain('Gone')
  })

  test('nothing is asked when no thread is open', () => {
    const graph = new SceneGraph()
    expect(commentThreadsPrompt(graph, [thread({ id: 'done', resolved: true })])).toBeNull()
    expect(commentThreadsPrompt(graph, [])).toBeNull()
  })
})
