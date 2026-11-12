/**
 * Convert to layers: a script's drawn output becomes ordinary layers in one undo step, and undo
 * puts the live script back with the layers it drew.
 */
import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import { convertScriptToLayers } from '@/app/code/script/convert'
import { insertScriptNode } from '@/app/code/script/create'
import { materializeScriptOutput } from '@/app/code/script/materialize'
import { createEditorStore } from '@/app/editor/session/create'

/**
 * A page whose script has drawn two frames side by side. The output is materialized directly, as
 * the sandbox needs a browser frame and this test is about what conversion does with a drawn node.
 */
function scriptWithOutput() {
  const store = createEditorStore()
  const nodeId = insertScriptNode(store, 'return []')
  materializeScriptOutput(
    store.graph,
    nodeId,
    [
      { type: 'FRAME', name: 'A', width: 10, height: 10 },
      { type: 'FRAME', name: 'B', width: 10, height: 10 }
    ],
    store.state.currentPageId
  )
  return { store, nodeId }
}

describe('convert to layers', () => {
  test('replaces the script with its drawn layers, in order, at its place', () => {
    const { store, nodeId } = scriptWithOutput()
    const page = store.graph.getNode(store.state.currentPageId)
    const index = page?.childIds.indexOf(nodeId) ?? -1

    const kept = convertScriptToLayers(store, nodeId)
    const siblings = store.graph.getNode(store.state.currentPageId)?.childIds ?? []

    expect(store.graph.getNode(nodeId)).toBeUndefined()
    expect(kept).toHaveLength(2)
    expect(siblings.slice(index, index + 2)).toEqual(kept)
    expect(kept.map((id) => store.graph.getNode(id)?.name)).toEqual(['A', 'B'])
    expect([...store.state.selectedIds]).toEqual(kept)
  })

  test('is one undo step, restoring the script and its output', () => {
    const { store, nodeId } = scriptWithOutput()
    const before = store.graph.getNode(nodeId)?.childIds.length ?? 0

    convertScriptToLayers(store, nodeId)
    store.undo.undo()

    const restored = store.graph.getNode(nodeId)
    expect(restored?.type).toBe('SCRIPT')
    expect(restored?.childIds).toHaveLength(before)
    expect(store.graph.getNode(store.state.currentPageId)?.childIds).toContain(nodeId)
  })

  test('leaves a script with no output out of the page entirely', () => {
    const store = createEditorStore()
    const nodeId = insertScriptNode(store, 'return []')

    expect(convertScriptToLayers(store, nodeId)).toEqual([])
    expect(store.graph.getNode(nodeId)).toBeUndefined()
  })

  test('ignores a node that is not a script', () => {
    const store = createEditorStore()
    const frame = store.graph.createNode('FRAME', store.state.currentPageId, { name: 'Plain' })

    expect(convertScriptToLayers(store, frame.id)).toEqual([])
    expect(store.graph.getNode(frame.id)?.name).toBe('Plain')
  })
})
