import { describe, expect, test } from 'bun:test'

import { PEN_PLUGIN_DATA_NAMESPACE } from '@open-pencil/pen'
import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'
import { withAgentNotes, type AgentNotesDraft } from '@open-pencil/scene-graph/agent-notes'
import { createSticky } from '@open-pencil/scene-graph/generated'

import { collectLayerNotes, MAX_LAYER_NOTES } from '@/app/ai/notes/collect'

function page() {
  const graph = new SceneGraph()
  return { graph, pageId: graph.getPages()[0].id }
}

function noted(graph: SceneGraph, parentId: string, name: string, draft: AgentNotesDraft) {
  const node = graph.createNode('FRAME', parentId, { name })
  graph.updateNode(node.id, { pluginData: withAgentNotes(node, draft) })
  return node
}

function penEntry(key: string, value: unknown) {
  return {
    pluginId: PEN_PLUGIN_DATA_NAMESPACE,
    key: `${PEN_PLUGIN_DATA_NAMESPACE}/${key}`,
    value: JSON.stringify(value)
  }
}

const ids = (notes: readonly { id: string }[]) => notes.map((note) => note.id)

describe('notes a request reads', () => {
  test('with nothing in focus, every note on the page in layer order', () => {
    const { graph, pageId } = page()
    const screen = noted(graph, pageId, 'Screen', { context: 'Checkout step 2' })
    const button = noted(graph, screen.id, 'Pay', { context: 'Opens the receipt dialog' })
    graph.createNode('FRAME', pageId, { name: 'Plain' })
    const other = graph.addPage('Other')
    noted(graph, other.id, 'Elsewhere', { context: 'Not on this page' })

    expect(ids(collectLayerNotes(graph, pageId))).toEqual([screen.id, button.id])
  })

  test('with layers in focus, those layers, what holds them and what they hold', () => {
    const { graph, pageId } = page()
    const screen = noted(graph, pageId, 'Screen', { context: 'Checkout' })
    const form = graph.createNode('FRAME', screen.id, { name: 'Form' })
    const button = noted(graph, form.id, 'Pay', { prompt: 'Make it the primary action' })
    noted(graph, pageId, 'Unrelated', { context: 'Marketing banner' })

    const notes = collectLayerNotes(graph, pageId, [form.id])
    expect(ids(notes)).toEqual([screen.id, button.id])
    expect(notes[1]).toMatchObject({ prompt: 'Make it the primary action' })
  })

  test('the same notes on layers of one name are listed once with a count', () => {
    const { graph, pageId } = page()
    const first = noted(graph, pageId, 'Button', { context: 'Submits the form' })
    noted(graph, pageId, 'Button', { context: 'Submits the form' })
    noted(graph, pageId, 'Button', { context: 'Submits the form' })

    expect(collectLayerNotes(graph, pageId)).toEqual([
      expect.objectContaining({ id: first.id, repeats: 2 })
    ])
  })

  test('notes that differ by the model a prompt names or by their layer kind stay apart', () => {
    const { graph, pageId } = page()
    const text = 'Add a dark mode toggle'
    const promptCard = (model: string) => {
      const card = createSticky(graph, pageId, { text })
      graph.updateNode(card.id, {
        pluginData: [penEntry('type', 'prompt'), penEntry('model', model)]
      })
      return card
    }
    const claude = promptCard('claude-test')
    const gpt = promptCard('gpt-test')

    expect(collectLayerNotes(graph, pageId)).toEqual([
      expect.objectContaining({ id: claude.id, model: 'claude-test' }),
      expect.objectContaining({ id: gpt.id, model: 'gpt-test' })
    ])

    const frame = noted(graph, pageId, 'Badge', { context: 'Shows the plan' })
    const rectangle = graph.createNode('RECTANGLE', pageId, { name: 'Badge' })
    graph.updateNode(rectangle.id, {
      pluginData: withAgentNotes(rectangle, { context: 'Shows the plan' })
    })
    expect(ids(collectLayerNotes(graph, pageId))).toEqual([
      claude.id,
      gpt.id,
      frame.id,
      rectangle.id
    ])
  })

  test('a page of notes is bounded', () => {
    const { graph, pageId } = page()
    for (let index = 0; index < MAX_LAYER_NOTES + 5; index++) {
      noted(graph, pageId, `Layer ${index}`, { context: `Note ${index}` })
    }
    expect(collectLayerNotes(graph, pageId)).toHaveLength(MAX_LAYER_NOTES)
  })

  test('repeats found past the cap still count', () => {
    const { graph, pageId } = page()
    const first = noted(graph, pageId, 'Button', { context: 'Submits the form' })
    for (let index = 0; index < MAX_LAYER_NOTES + 5; index++) {
      noted(graph, pageId, `Layer ${index}`, { context: `Note ${index}` })
    }
    noted(graph, pageId, 'Button', { context: 'Submits the form' })

    const notes = collectLayerNotes(graph, pageId)
    expect(notes).toHaveLength(MAX_LAYER_NOTES)
    expect(notes[0]).toMatchObject({ id: first.id, repeats: 1 })
  })

  test("a .pen file's context field and prompt card are read like Pairdraw's notes", () => {
    const { graph, pageId } = page()
    const field = graph.createNode('FRAME', pageId, { name: 'Nav' })
    graph.updateNode(field.id, { pluginData: [penEntry('context', 'Sticks to the top')] })
    const card = createSticky(graph, pageId, { text: 'Add a dark mode toggle' })
    graph.updateNode(card.id, {
      pluginData: [penEntry('type', 'prompt'), penEntry('model', 'claude-test')]
    })

    const notes = collectLayerNotes(graph, pageId)
    const byId = new Map(notes.map((note) => [note.id, note]))
    expect(byId.get(field.id)).toMatchObject({ context: 'Sticks to the top' })
    expect(byId.get(card.id)).toMatchObject({
      prompt: 'Add a dark mode toggle',
      model: 'claude-test'
    })

    // A prompt card is on the page beside the design, so focus elsewhere still reads it.
    const focused = collectLayerNotes(graph, pageId, [field.id])
    expect(ids(focused)).toContain(card.id)
  })

  test('layers without notes and unreadable notes are skipped', () => {
    const { graph, pageId } = page()
    const broken: SceneNode = graph.createNode('FRAME', pageId, { name: 'Broken' })
    graph.updateNode(broken.id, { pluginData: [penEntry('context', { not: 'text' })] })
    expect(collectLayerNotes(graph, pageId)).toEqual([])
  })
})
