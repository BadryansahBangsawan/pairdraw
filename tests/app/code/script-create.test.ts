import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import { insertScriptNode, SCRIPT_STARTER_SOURCE, setScriptSource } from '@/app/code/script/create'
import { readScriptNodeData, scriptChangeNeedsRun } from '@/app/code/script/run-node'
import { createEditorStore } from '@/app/editor/session/create'

/** A page holding one script node, written through the same path the panel uses. */
function scriptNode() {
  const store = createEditorStore()
  const node = store.graph.createNode('SCRIPT', store.state.currentPageId, {
    name: 'Chart',
    width: 320,
    height: 200
  })
  return { store, node }
}

describe('writing a script node source', () => {
  test('stores the source in the document as one undo step', () => {
    const { store, node } = scriptNode()
    setScriptSource(store, node.id, 'return []')

    expect(readScriptNodeData(store.graph, node.id)).toMatchObject({
      version: 1,
      source: 'return []'
    })

    store.undo.undo()

    expect(readScriptNodeData(store.graph, node.id)).toBeUndefined()
  })

  test('clearing the source removes the program and leaves other plugin data alone', () => {
    const { store, node } = scriptNode()
    setScriptSource(store, node.id, 'return []')
    const notes = {
      pluginId: 'user-notes',
      key: 'content',
      value: JSON.stringify({ text: 'kept' })
    }
    store.graph.updateNode(node.id, { pluginData: [...node.pluginData, notes] })
    setScriptSource(store, node.id, '   ')

    // The node has no program, so it draws nothing; the entry is gone rather than left stale.
    expect(readScriptNodeData(store.graph, node.id)).toBeUndefined()
    expect(store.graph.getNode(node.id)?.pluginData).toContainEqual(notes)
  })

  test('a source edit is a change that re-runs the script', () => {
    expect(scriptChangeNeedsRun({ pluginData: [] })).toBe(true)
    expect(scriptChangeNeedsRun({ width: 10 })).toBe(true)
    expect(scriptChangeNeedsRun({})).toBe(false)
  })
})

describe('inserting a script node', () => {
  test('places it on the current page, selects it, and writes the starter program', () => {
    const store = createEditorStore()
    const id = insertScriptNode(store)

    expect(store.graph.getNode(id)).toMatchObject({
      type: 'SCRIPT',
      parentId: store.state.currentPageId
    })
    expect([...store.state.selectedIds]).toEqual([id])
    expect(readScriptNodeData(store.graph, id)?.source).toBe(SCRIPT_STARTER_SOURCE)
  })
})
