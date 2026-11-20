import { cachedDesignMemory, type DesignMemory } from '@pairdraw/scene-graph/design-memory'
import {
  PAIRDRAW_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@pairdraw/scene-graph/plugin-data'

import type { EditorContext } from './types'

/** The document's design memory, and the command that replaces it. */
export function createDesignMemoryActions(ctx: EditorContext) {
  function designMemory(): DesignMemory | null {
    return cachedDesignMemory(ctx.graph)
  }

  /**
   * Replaces the document's design memory, or removes it with null, as one undo step labelled
   * `label`. Undo restores only the memory, so comments written meanwhile on the document node
   * stay.
   */
  function setDesignMemory(next: DesignMemory | null, label = 'Edit design memory'): void {
    const field = PAIRDRAW_PLUGIN_DATA.designMemory
    const rootId = ctx.graph.rootId
    const previous = readPluginData(ctx.graph.getNode(rootId)?.pluginData, field)
    const write = (value: DesignMemory | undefined) => {
      const root = ctx.graph.getNode(rootId)
      if (!root) return
      ctx.graph.updateNode(rootId, {
        pluginData: withPluginData(root.pluginData, field, value && structuredClone(value))
      })
      ctx.requestRender()
    }
    const value = next ?? undefined
    write(value)
    ctx.undo.push({ label, forward: () => write(value), inverse: () => write(previous) })
  }

  return { designMemory, setDesignMemory }
}
