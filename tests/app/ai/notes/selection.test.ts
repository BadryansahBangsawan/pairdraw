import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { readAgentNotes } from '@pairdraw/scene-graph/agent-notes'

import { stripModelNotes } from '@/app/ai/chat/context'
import { takePendingPrompt } from '@/app/ai/chat/pending-prompt'
import { mentionedNodes } from '@/app/ai/chat/references/nodes'
import { appendCanvasNotes } from '@/app/ai/chat/submission/notes'
import { runAgentPrompt, saveAgentNotes } from '@/app/ai/notes/selection'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

const savedPreferences = structuredClone(toRaw(appPreferences.value))
afterEach(() => {
  appPreferences.value = structuredClone(savedPreferences)
})

function storeWithFrame(name = 'Pay') {
  const store = createEditorStore()
  const node = store.graph.createNode('FRAME', store.state.currentPageId, {
    name,
    width: 200,
    height: 60
  })
  return { store, node }
}

function notesOn(store: ReturnType<typeof createEditorStore>, id: string) {
  const node = store.graph.getNode(id)
  return node ? readAgentNotes(node) : null
}

test('editing notes is one undo step, and an unchanged field records none', () => {
  const { store, node } = storeWithFrame()
  try {
    saveAgentNotes(store, node.id, { context: 'Opens the receipt dialog' })
    expect(notesOn(store, node.id)).toEqual({ context: 'Opens the receipt dialog' })

    // Saving the same notes again records nothing, so one undo removes the notes.
    saveAgentNotes(store, node.id, { context: ' Opens the receipt dialog ' })
    store.undoAction()
    expect(notesOn(store, node.id)).toBeNull()

    store.redoAction()
    saveAgentNotes(store, node.id, null)
    expect(notesOn(store, node.id)).toBeNull()
  } finally {
    store.dispose()
  }
})

test("Run prompt sends the layer's prompt to its document's chat, naming the layer", () => {
  const { store, node } = storeWithFrame('Hero')
  try {
    expect(runAgentPrompt(store, node.id, '   ')).toBe(false)
    expect(runAgentPrompt(store, node.id, 'Make it bolder')).toBe(true)
    const submission = takePendingPrompt(store)
    expect(submission?.nodes.map((referenced) => referenced.id)).toEqual([node.id])
    expect(mentionedNodes(store.graph, submission?.displayText ?? '')).toHaveLength(1)
  } finally {
    store.dispose()
  }
})

test('a request carries the notes of the selection and how to explore it', () => {
  const { store, node } = storeWithFrame('Checkout')
  try {
    saveAgentNotes(store, node.id, { context: 'Step 2 of 3' })
    store.select([node.id])
    const text = appendCanvasNotes(store, {
      modelText: 'Try other layouts',
      nodes: [],
      explore: { kind: 'variants', count: 3, axis: 'layout' }
    })
    expect(stripModelNotes(text)).toBe('Try other layouts')
    expect(text).toContain(`<layer-note id="${node.id}"`)
    expect(text).toContain('<explore mode="variants" count="3" axis="layout"')
    // The variants start from the selected design, right of it.
    const start = Number(/ x="(-?\d+)"/.exec(text)?.[1])
    expect(start).toBeGreaterThan(node.x + node.width)
  } finally {
    store.dispose()
  }
})

test('a request without notes or exploring is sent as written', () => {
  const { store } = storeWithFrame()
  try {
    expect(appendCanvasNotes(store, { modelText: 'Hello', nodes: [] })).toBe('Hello')
  } finally {
    store.dispose()
  }
})
