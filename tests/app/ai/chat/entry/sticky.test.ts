import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import { createSticky } from '@open-pencil/scene-graph/generated'

import { selectedStickyNotes, stickyPrompt } from '@/app/ai/chat/entry/sticky'
import { findReferences } from '@/app/ai/chat/references/link'

function board() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  return { graph, page }
}

describe('sticky notes as prompts', () => {
  test("a note's text goes first, then a reference to the note it came from", () => {
    const { graph, page } = board()
    const note = createSticky(graph, page, { text: '  A hero section for a bakery  ' })
    graph.updateNode(note.id, { name: 'Bakery hero' })

    const prompt = stickyPrompt(graph, [note.id])
    expect(prompt?.startsWith('A hero section for a bakery\n\nFrom the sticky note ')).toBe(true)
    expect(findReferences(prompt ?? '').map(({ reference }) => reference)).toEqual([
      { kind: 'node', id: note.id, label: 'Bakery hero' }
    ])
  })

  test('several notes each give their text and reference, in selection order', () => {
    const { graph, page } = board()
    const first = createSticky(graph, page, { text: 'Pricing page' })
    const second = createSticky(graph, page, { text: 'Dark theme' })

    const prompt = stickyPrompt(graph, [second.id, first.id]) ?? ''
    expect(prompt.indexOf('Dark theme')).toBeLessThan(prompt.indexOf('Pricing page'))
    expect(findReferences(prompt).map(({ reference }) => reference.id)).toEqual([
      second.id,
      first.id
    ])
  })

  test('empty notes are left out, and nothing is offered without text', () => {
    const { graph, page } = board()
    const empty = createSticky(graph, page, { text: '   ' })
    const filled = createSticky(graph, page, { text: 'Onboarding flow' })

    expect(selectedStickyNotes(graph, [empty.id, filled.id]).map(({ note }) => note.id)).toEqual([
      filled.id
    ])
    expect(stickyPrompt(graph, [empty.id])).toBeNull()
    expect(stickyPrompt(graph, [])).toBeNull()
  })

  test('a selection with anything but sticky notes offers no prompt', () => {
    const { graph, page } = board()
    const note = createSticky(graph, page, { text: 'A settings page' })
    const frame = graph.createNode('FRAME', page, { name: 'Frame' })

    expect(stickyPrompt(graph, [note.id, frame.id])).toBeNull()
    expect(stickyPrompt(graph, [frame.id])).toBeNull()
  })
})
