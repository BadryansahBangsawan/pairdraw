import {
  allowDesignValue,
  pinDesignExample,
  type DesignMemory,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'

import type { EditorStore } from '@/app/editor/active-store'

/** Opens the design memory dialog on its rules. */
export function openDesignMemoryDialog(store: EditorStore): void {
  store.state.designMemoryLearnFrom = null
  store.state.designMemoryOpen = true
}

/**
 * Opens the dialog on the values the layers use, to add as rules. A document without a memory
 * gets one only when the person confirms what to add, so cancelling leaves nothing behind.
 */
export function learnDesignMemory(store: EditorStore, nodeIds: readonly string[]): void {
  store.state.designMemoryLearnFrom = [...nodeIds]
  store.state.designMemoryOpen = true
}

/** Proposes a memory from the values every page uses; nothing is written until confirmed. */
export function createDesignMemoryFromDocument(store: EditorStore): void {
  learnDesignMemory(
    store,
    store.graph.getPages().map((page) => page.id)
  )
}

/** Replaces the memory through `change`, as one undo step; nothing when there is none. */
export function changeDesignMemory(
  store: EditorStore,
  change: (memory: DesignMemory) => DesignMemory,
  label?: string
): void {
  const memory = store.designMemory()
  if (!memory) return
  const next = change(memory)
  if (next !== memory) store.setDesignMemory(next, label)
}

/** Lets agents use `value` from now on: the escape a refusal or a lint finding offers. */
export function allowDesignMemoryValue(
  store: EditorStore,
  group: DesignMemoryGroup,
  value: string | number
): void {
  changeDesignMemory(store, (memory) => allowDesignValue(memory, group, value), `Allow ${value}`)
}

/** Pins the layers as examples, or unpins them when they all are already. */
export function toggleDesignExamples(store: EditorStore, nodeIds: readonly string[]): void {
  changeDesignMemory(store, (memory) => {
    const pinned = new Set(memory.examples.map((example) => example.nodeId))
    if (nodeIds.every((id) => pinned.has(id))) {
      return {
        ...memory,
        examples: memory.examples.filter((example) => !nodeIds.includes(example.nodeId))
      }
    }
    return nodeIds.reduce(pinDesignExample, memory)
  })
}

/** Closes the dialog and shows a pinned example on its page, selected. */
export async function showDesignExample(store: EditorStore, nodeId: string): Promise<void> {
  const pageId = store.graph.pageOf(nodeId)
  if (!pageId) return
  store.state.designMemoryOpen = false
  if (pageId !== store.state.currentPageId) await store.switchPage(pageId)
  store.select([nodeId])
  store.revealNodes([nodeId])
}
