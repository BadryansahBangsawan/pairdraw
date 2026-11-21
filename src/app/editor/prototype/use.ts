import { computed } from 'vue'

import { framesOnPage } from '@pairdraw/core/prototype'
import type {
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTriggerType
} from '@pairdraw/scene-graph'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'
import { useSceneComputed } from '@pairdraw/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'

import type { ActionChoice } from './reactions'
import {
  createReaction,
  setActionChoice,
  setDelay,
  setTarget,
  setTransition,
  setTransitionDuration,
  setTriggerType,
  withReaction,
  withReactionChange,
  withoutReaction
} from './reactions'

const LABEL = 'Edit interaction'

/**
 * The selected layer's interactions, each edit one undo step. Every setter reads the stored list,
 * so the panel never holds a copy a second edit could overwrite.
 */
export function usePrototype() {
  const store = useEditorStore()
  const { selectedNode } = useSelectionState()

  const reactions = computed<readonly PrototypeReaction[]>(
    () => selectedNode.value?.prototypeReactions ?? []
  )

  /** Frames on the current page, which a navigation or overlay may point at. */
  const targets = useSceneComputed(() => framesOnPage(store.graph, store.state.currentPageId))

  function commit(next: readonly PrototypeReaction[], label: string) {
    const node = selectedNode.value
    if (!node) return
    store.updateNodeWithUndo(node.id, { prototypeReactions: [...next] }, label)
  }

  function edit(change: (reaction: PrototypeReaction) => PrototypeReaction, id: string) {
    commit(withReactionChange(reactions.value, id, change), LABEL)
  }

  return {
    reactions,
    targets,
    play: () => store.startPlay(),
    add: () => commit(withReaction(reactions.value, createReaction()), 'Add interaction'),
    remove: (id: string) => commit(withoutReaction(reactions.value, id), 'Remove interaction'),
    setTriggerType: (id: string, type: PrototypeTriggerType) =>
      edit((reaction) => setTriggerType(reaction, type), id),
    setDelay: (id: string, seconds: number) => edit((reaction) => setDelay(reaction, seconds), id),
    setActionChoice: (id: string, choice: ActionChoice) =>
      edit((reaction) => setActionChoice(reaction, choice), id),
    setTarget: (id: string, nodeId: string | null) =>
      edit((reaction) => setTarget(reaction, nodeId), id),
    setTransition: (id: string, type: PrototypeTransitionType) =>
      edit((reaction) => setTransition(reaction, type), id),
    setTransitionDuration: (id: string, seconds: number) =>
      edit((reaction) => setTransitionDuration(reaction, seconds), id)
  }
}

export type { PrototypeReaction }
