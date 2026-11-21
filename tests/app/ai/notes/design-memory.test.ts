import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import type { UIMessage } from 'ai'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  addDesignDecision,
  allowDesignValue,
  createDesignMemory,
  pinDesignExample,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'

import { DESIGN_MEMORY_MAX_LENGTH, stripModelNotes } from '@/app/ai/chat/context'
import { appendCanvasNotes } from '@/app/ai/chat/submission/notes'
import { designMemoryNote } from '@/app/ai/notes/design-memory'
import { createEditorStore } from '@/app/editor/session/create'

function userMessage(text: string): UIMessage {
  return { id: 'earlier', role: 'user', parts: [{ type: 'text', text }] }
}

describe('the design memory a request carries', () => {
  test('lists what each group allows, how it is enforced, the examples and the decisions', () => {
    const graph = new SceneGraph()
    const card = graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card' })
    let memory = allowDesignValue(createDesignMemory(), 'colors', '#1A73E8')
    memory = allowDesignValue(memory, 'spacing', 16)
    memory = addDesignDecision(memory, 'Cards use <16 px> padding.', 'person')
    memory = pinDesignExample(memory, card.id)
    writeDesignMemory(graph, memory)

    expect(designMemoryNote(graph)).toBe(
      [
        '<design-memory>',
        'Colors (an edit with another value is undone): #1A73E8',
        'Fonts: not checked',
        'Font sizes: not checked',
        'Spacing (other values are warned about): 16',
        'Corner radii: not checked',
        `Examples to follow: "Card" (${card.id})`,
        'Decisions:',
        '- Cards use &lt;16 px&gt; padding.',
        '</design-memory>'
      ].join('\n')
    )
    expect(designMemoryNote(new SceneGraph())).toBeNull()
  })

  test('many allowed values stay within the budget and are counted past it', () => {
    const graph = new SceneGraph()
    let memory = createDesignMemory()
    for (let index = 0; index < 120; index++)
      memory = allowDesignValue(
        memory,
        'colors',
        `#${(0x100000 + index * 4099).toString(16).slice(-6)}`
      )
    for (let index = 1; index <= 32; index++) {
      memory = allowDesignValue(memory, 'fontSizes', index * 1.5)
      memory = allowDesignValue(memory, 'spacing', index * 2.25)
      memory = allowDesignValue(memory, 'radius', index * 3.5)
    }
    for (let index = 0; index < 16; index++)
      memory = allowDesignValue(memory, 'fonts', `Family ${index} Display`)
    writeDesignMemory(graph, memory)
    const note = designMemoryNote(graph) ?? ''
    expect(note.length).toBeLessThanOrEqual(DESIGN_MEMORY_MAX_LENGTH)
    expect(note).toMatch(/Colors \(.*\+\d+ more/)
  })

  test('decisions past the length budget are counted, not cut', () => {
    const graph = new SceneGraph()
    let memory = createDesignMemory()
    for (let index = 0; index < 20; index++)
      memory = addDesignDecision(memory, `${index} ${'x'.repeat(300)}`, 'person')
    writeDesignMemory(graph, memory)
    const note = designMemoryNote(graph) ?? ''
    expect(note.length).toBeLessThanOrEqual(DESIGN_MEMORY_MAX_LENGTH + 200)
    expect(note).toMatch(/\(\d+ more decisions; get_design_memory reads them\)/)
  })

  test('goes with the first request and again only after the memory changes', () => {
    const store = createEditorStore()
    try {
      store.setDesignMemory(allowDesignValue(createDesignMemory(), 'colors', '#1A73E8'))
      const first = appendCanvasNotes(store, { modelText: 'Make a card', nodes: [] })
      expect(stripModelNotes(first)).toBe('Make a card')
      expect(first).toContain('<design-memory>')

      const again = appendCanvasNotes(store, { modelText: 'Another', nodes: [] }, [
        userMessage(first)
      ])
      expect(again).toBe('Another')

      store.setDesignMemory(allowDesignValue(createDesignMemory(), 'colors', '#00FF00'))
      const changed = appendCanvasNotes(store, { modelText: 'Again', nodes: [] }, [
        userMessage(first)
      ])
      expect(changed).toContain('#00FF00')
    } finally {
      store.dispose()
    }
  })
})
