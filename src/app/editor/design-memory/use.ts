import { describeDesignMemory } from '@pairdraw/core/design-memory'
import type { DesignMemory } from '@pairdraw/scene-graph/design-memory'
import { useSceneComputed } from '@pairdraw/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'

import { changeDesignMemory } from './actions'

/**
 * The active document's design memory for the panel and the dialog: the stored memory, its
 * rules resolved against the document's variables and styles, and the way to change it, each
 * change one undo step.
 */
export function useDesignMemory() {
  const store = useEditorStore()
  const memory = useSceneComputed(() => store.designMemory())
  const report = useSceneComputed(() => (memory.value ? describeDesignMemory(store.graph) : null))
  function change(edit: (current: DesignMemory) => DesignMemory, label?: string) {
    changeDesignMemory(store, edit, label)
  }
  return { store, memory, report, change }
}
