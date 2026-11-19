/**
 * The `script` tool's app side: code layers run in the sandbox, which only the app has, so the app
 * registers this host for its document. A headless host registers nothing and the tool says so.
 */
import { registerScriptToolHost, type ScriptToolHost } from '@pairdraw/core/tools'

import { setScriptSource } from '@/app/code/script/create'
import { runScriptNode } from '@/app/code/script/run-node'
import type { EditorStore } from '@/app/editor/active-store'

/** A code layer placed by the agent draws at the size the panel's own layer starts at. */
const SCRIPT_WIDTH = 360
const SCRIPT_HEIGHT = 240

export function bindScriptToolHost(store: EditorStore): () => void {
  async function run(id: string): ReturnType<ScriptToolHost['run']> {
    const result = await runScriptNode(store.graph, id, store.state.currentPageId)
    return result.ok
      ? { id, ok: true, layers: result.nodeCount }
      : { id, ok: false, error: result.error }
  }

  const host: ScriptToolHost = {
    async create({ source, x = 0, y = 0 }) {
      // The layer exists only to carry the program: one that cannot draw is not a layer, and the
      // caller is told what the program did wrong instead of being handed a broken node.
      store.undo.beginBatch('Create code layer')
      try {
        const id = store.createShape(
          'SCRIPT',
          Math.round(x),
          Math.round(y),
          SCRIPT_WIDTH,
          SCRIPT_HEIGHT
        )
        setScriptSource(store, id, source)
        const result = await run(id)
        if (result.ok) store.undo.commitBatch()
        else store.undo.rollbackBatch()
        return result
      } catch (error) {
        store.undo.rollbackBatch()
        throw error
      }
    },
    setSource(id, source) {
      setScriptSource(store, id, source)
    },
    run
  }
  return registerScriptToolHost(store.graph, host)
}
