/**
 * Naming: a text layer a script draws without a name is named by its text, as canvas text, the
 * Plugin API and design JSX name it.
 */
import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import { insertScriptNode } from '@/app/code/script/create'
import { materializeScriptOutput } from '@/app/code/script/materialize'
import { createEditorStore } from '@/app/editor/session/create'

function draw(specs: Parameters<typeof materializeScriptOutput>[2]) {
  const store = createEditorStore()
  const nodeId = insertScriptNode(store, 'return []')
  materializeScriptOutput(store.graph, nodeId, specs, store.state.currentPageId)
  return {
    store,
    drawn: (store.graph.getNode(nodeId)?.childIds ?? []).map((id) => store.graph.getNode(id))
  }
}

describe('naming script output', () => {
  test('names an unnamed text layer by its text', () => {
    const { drawn } = draw([{ type: 'TEXT', text: 'Short label' }])
    expect(drawn[0]).toMatchObject({ type: 'TEXT', name: 'Short label' })
  })

  test('keeps the name a script gives', () => {
    const { drawn } = draw([{ type: 'TEXT', text: 'Short label', name: 'Label' }])
    expect(drawn[0]?.name).toBe('Label')
  })

  test('names an empty text layer by its type', () => {
    const { drawn } = draw([{ type: 'TEXT' }])
    expect(drawn[0]?.name).toBe('Text')
  })
})
