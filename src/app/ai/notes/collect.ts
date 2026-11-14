import * as v from 'valibot'

import { PEN_PLUGIN_DATA_NAMESPACE } from '@pairdraw/pen'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  clampAgentNote,
  readAgentNotes,
  type AgentNotesDraft
} from '@pairdraw/scene-graph/agent-notes'
import { generatedFrameText } from '@pairdraw/scene-graph/generated'

import type { LayerNote } from '@/app/ai/chat/context'

/** The most layers' notes one request carries; a page of notes past it is read with tools. */
export const MAX_LAYER_NOTES = 30

const penTextSchema = v.pipe(v.string(), v.parseJson(), v.string())

/** A pen.dev field kept on the layer as shared plugin data, when it holds text. */
function penText(node: SceneNode, key: string): string | undefined {
  const entry = node.pluginData.find(
    (item) =>
      item.pluginId === PEN_PLUGIN_DATA_NAMESPACE &&
      item.key === `${PEN_PLUGIN_DATA_NAMESPACE}/${key}`
  )
  const parsed = v.safeParse(penTextSchema, entry?.value)
  const text = parsed.success ? clampAgentNote(parsed.output) : ''
  return text || undefined
}

/** What a `.pen` file left on the layer: its `context` field, and a prompt or context card's text. */
function penNotes(graph: SceneGraph, node: SceneNode): AgentNotesDraft & { model?: string } {
  const card = penText(node, 'type')
  const text = card ? clampAgentNote(generatedFrameText(graph, node)?.text ?? '') : ''
  return {
    context: penText(node, 'context') ?? (card === 'context' && text ? text : undefined),
    prompt: card === 'prompt' && text ? text : undefined,
    model: card === 'prompt' ? penText(node, 'model') : undefined
  }
}

/**
 * The notes on a layer: the ones written in Pairdraw, which win, then a pen.dev `context` field
 * and the text of a pen.dev prompt or context card, which a `.pen` file opens as a sticky note.
 */
function notesOf(graph: SceneGraph, node: SceneNode): LayerNote | null {
  if (node.pluginData.length === 0) return null
  const own = readAgentNotes(node)
  const pen = penNotes(graph, node)
  const context = own?.context ?? pen.context
  const prompt = own?.prompt ?? pen.prompt
  if (!context && !prompt) return null
  // The model belongs to the pen.dev prompt, so it goes only with that prompt.
  const model = own?.prompt ? undefined : pen.model
  return { id: node.id, name: node.name, type: node.type, context, prompt, model }
}

/** The layer and everything in it, depth first in layer order. */
function* subtree(graph: SceneGraph, node: SceneNode): Generator<SceneNode> {
  yield node
  for (const child of graph.getChildren(node.id)) yield* subtree(graph, child)
}

/** The layers above `node` up to its page, outermost first. */
function ancestors(graph: SceneGraph, node: SceneNode): SceneNode[] {
  const chain: SceneNode[] = []
  if (node.parentId) {
    graph.closest(node.parentId, (current) => {
      if (current.type === 'CANVAS' || current.id === graph.rootId) return true
      chain.push(current)
      return false
    })
  }
  return chain.reverse()
}

/**
 * The layers whose notes a request reads: with layers in focus (the ones it names, or the
 * selection), those layers, what is inside them and what holds them, then the pen.dev note cards
 * on the page; with none, the whole page.
 */
function* scope(graph: SceneGraph, pageId: string, focusIds: readonly string[]) {
  const page = graph.getNode(pageId)
  const focus = focusIds.flatMap((id) => {
    const node = graph.getNode(id)
    return node && node.type !== 'CANVAS' ? [node] : []
  })
  if (focus.length === 0) {
    if (page) for (const child of graph.getChildren(page.id)) yield* subtree(graph, child)
    return
  }
  for (const node of focus) {
    yield* ancestors(graph, node)
    yield* subtree(graph, node)
  }
  if (page) {
    for (const child of graph.getChildren(page.id)) if (penText(child, 'type')) yield child
  }
}

/**
 * The notes people left for agents on the layers a request concerns, in layer order, at most
 * `MAX_LAYER_NOTES`. Layers of one name with the same notes, such as instances of a noted
 * component, are listed once with a count of the others.
 */
export function collectLayerNotes(
  graph: SceneGraph,
  pageId: string,
  focusIds: readonly string[] = []
): LayerNote[] {
  const notes: LayerNote[] = []
  const byContent = new Map<string, LayerNote>()
  const seen = new Set<string>()
  for (const node of scope(graph, pageId, focusIds)) {
    if (seen.has(node.id)) continue
    seen.add(node.id)
    const note = notesOf(graph, node)
    if (!note) continue
    // Everything a note shows but its id, so a merged note states the same facts for every layer.
    const key = [
      note.type,
      note.name,
      note.context ?? '',
      note.prompt ?? '',
      note.model ?? ''
    ].join('\u0000')
    const same = byContent.get(key)
    if (same) {
      same.repeats = (same.repeats ?? 0) + 1
      continue
    }
    // Past the cap the walk goes on, so the listed notes still count every repeat.
    if (notes.length === MAX_LAYER_NOTES) continue
    byContent.set(key, note)
    notes.push(note)
  }
  return notes
}
