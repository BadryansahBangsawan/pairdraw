import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { createDocumentGraph } from '@pairdraw/core'
import { getScriptToolHost } from '@pairdraw/core/tools'

import { bindScriptToolHost } from '@/app/code/script/tool-host'
import { createEditorStore } from '@/app/editor/session/create'

const stores: ReturnType<typeof createEditorStore>[] = []

function storeWithDocument() {
  const store = createEditorStore(createDocumentGraph('design'))
  stores.push(store)
  return store
}

afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

test('a create that cannot draw leaves no layer and no undo step', async () => {
  const store = storeWithDocument()
  const unbind = bindScriptToolHost(store)
  try {
    const host = getScriptToolHost(store.graph)
    if (!host) throw new Error('script host was not registered')
    const result = await host.create({ source: 'return pencil.rect({})' })
    expect(result).toMatchObject({ ok: false, error: 'Script execution requires a browser.' })
    expect(store.graph.getNode(result.id)).toBeUndefined()
    expect(store.undo.canUndo).toBe(false)
  } finally {
    unbind()
  }
})

test('a failed edit of an existing layer keeps it', async () => {
  const store = storeWithDocument()
  const id = store.graph.createNode('SCRIPT', store.state.currentPageId)
  const unbind = bindScriptToolHost(store)
  try {
    const host = getScriptToolHost(store.graph)
    if (!host) throw new Error('script host was not registered')
    const result = await host.run(id.id)
    expect(result).toMatchObject({ ok: false })
    expect(store.graph.getNode(id.id)).toBeDefined()
  } finally {
    unbind()
  }
})
