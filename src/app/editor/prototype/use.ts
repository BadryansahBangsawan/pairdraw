import { computed } from 'vue'

import { asInstanceEdit, framesOnPage, scrollsInPlay } from '@pairdraw/core/prototype'
import type {
  OverflowDirection,
  PrototypeEasingType,
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTriggerType,
  ScrollBehavior
} from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'
import { useSceneComputed } from '@pairdraw/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'

import { inheritedReactionCount, scrollDestinations, variantDestinations } from './destinations'
import type { ActionChoice } from './reactions'
import {
  createReaction,
  setActionChoice,
  setDelay,
  setTarget,
  setTransition,
  setTransitionDuration,
  setTransitionEasing,
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

  /** The variants a Change to on the selected layer can show. */
  const variantTargets = useSceneComputed(() => {
    const node = selectedNode.value
    return node ? variantDestinations(store.graph, node.id) : []
  })

  /** The layers a Scroll to on the selected layer can bring into view. */
  const scrollTargets = useSceneComputed(() => {
    const node = selectedNode.value
    return node ? scrollDestinations(store.graph, node.id) : []
  })

  /** How many interactions the selected instance runs from its main component. */
  const inheritedCount = useSceneComputed(() => {
    const node = selectedNode.value
    return node ? inheritedReactionCount(store.graph, node.id) : 0
  })

  /** Whether the selected layer can scroll in play: a frame, component, or instance. */
  const scrolls = computed(() => {
    const type = selectedNode.value?.type
    return type === 'FRAME' || type === 'COMPONENT' || type === 'INSTANCE'
  })

  /**
   * Whether the selected frame scrolls but will not in play: a frame inside another scrolls only
   * while it clips its content, as in Figma.
   */
  const scrollNeedsClip = useSceneComputed(() => {
    const node = selectedNode.value
    if (!node || node.overflowDirection === 'NONE' || node.clipsContent) return false
    return store.graph.getNode(node.parentId ?? '')?.type !== 'CANVAS'
  })

  function setOverflow(overflowDirection: OverflowDirection) {
    const node = selectedNode.value
    if (!node || node.overflowDirection === overflowDirection) return
    store.updateNodeWithUndo(node.id, { overflowDirection }, 'Change overflow scrolling')
  }

  /** Whether this layer sits in a frame play scrolls, where its own scroll behavior matters. */
  const scrollPositionable = useSceneComputed(() => {
    const node = selectedNode.value
    const parent = node ? store.graph.getNode(node.parentId ?? '') : undefined
    return parent !== undefined && scrollsInPlay(parent)
  })

  function setScrollBehavior(scrollBehavior: ScrollBehavior) {
    const node = selectedNode.value
    if (!node || node.scrollBehavior === scrollBehavior) return
    store.updateNodeWithUndo(node.id, { scrollBehavior }, 'Change position when scrolling')
  }

  /** Selects the main component of the selected instance, where its inherited interactions live. */
  function selectMain() {
    const node = selectedNode.value
    const main = node?.type === 'INSTANCE' ? instanceMainComponent(store.graph, node) : undefined
    if (main) store.select([main.id])
  }

  function commit(next: readonly PrototypeReaction[], label: string) {
    const node = selectedNode.value
    if (!node) return
    store.updateNodeWithUndo(node.id, { prototypeReactions: [...next] }, label)
  }

  /**
   * One edit to an interaction. On an instance, an edited copy of its main's interaction becomes
   * the instance's own, which play runs instead of the main's.
   */
  function edit(change: (reaction: PrototypeReaction) => PrototypeReaction, id: string) {
    const node = selectedNode.value
    const main = node?.type === 'INSTANCE' ? instanceMainComponent(store.graph, node) : undefined
    const inherited = main?.prototypeReactions ?? []
    const next = (reaction: PrototypeReaction) => asInstanceEdit(change(reaction), inherited)
    commit(withReactionChange(reactions.value, id, next), LABEL)
  }

  return {
    reactions,
    targets,
    variantTargets,
    scrollTargets,
    inheritedCount,
    selectMain,
    scrolls,
    overflow: computed(() => selectedNode.value?.overflowDirection ?? 'NONE'),
    scrollNeedsClip,
    setOverflow,
    scrollPositionable,
    scrollBehavior: computed(() => selectedNode.value?.scrollBehavior ?? 'SCROLLS'),
    setScrollBehavior,
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
      edit((reaction) => setTransitionDuration(reaction, seconds), id),
    setTransitionEasing: (id: string, easing: PrototypeEasingType) =>
      edit((reaction) => setTransitionEasing(reaction, easing), id)
  }
}

export type { PrototypeReaction }
