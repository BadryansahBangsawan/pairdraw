import { expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'

test('an edit that awaited past a graph swap records into the graph it began on', async () => {
  const editor = createEditor()
  try {
    const original = editor.graph
    original.createNode('RECTANGLE', original.getPages()[0].id, {
      id: 'shared:1',
      name: 'Before'
    })

    const { promise: waiting, resolve: finishWaiting } = Promise.withResolvers<undefined>()
    const edit = editor.recordEditAsync({ label: 'Agent' }, async () => {
      editor.graph.updateNode('shared:1', { name: 'Edited' })
      await waiting
    })
    await Promise.resolve()

    // A preview opens its own document while the agent's edit is still waiting.
    const preview = new SceneGraph()
    preview.createNode('RECTANGLE', preview.getPages()[0].id, {
      id: 'shared:1',
      name: 'Preview layer'
    })
    editor.replaceGraph(preview)
    finishWaiting()
    await edit

    // The step belongs to the document the edit was begun on, not the one opened meanwhile.
    expect(editor.graph.getNode('shared:1')?.name).toBe('Preview layer')
    expect(editor.undo.canUndo).toBe(false)

    editor.replaceGraph(original)
    expect(editor.graph.getNode('shared:1')?.name).toBe('Edited')
    expect(editor.undo.undoLabel).toBe('Agent')
    expect(editor.undo.undo()).toBe('Agent')
    expect(editor.graph.getNode('shared:1')?.name).toBe('Before')
  } finally {
    editor.dispose()
  }
})
