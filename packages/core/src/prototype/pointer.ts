import type { PrototypeTriggerType, SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import { playHitTest } from './hit'
import { effectiveReactions } from './reactions'
import type { PlayStep } from './scenes'
import { primaryAction, type PlayClick, type PlaySession } from './session'

/** The triggers the pointer runs by moving over a layer or pressing on it, rather than clicking. */
const POINTER_TRIGGERS: ReadonlySet<PrototypeTriggerType> = new Set<PrototypeTriggerType>([
  'ON_HOVER',
  'ON_PRESS',
  'MOUSE_ENTER',
  'MOUSE_LEAVE'
])

/** A reaction the pointer runs, with the delay a Mouse enter or Mouse leave waits first. */
export interface PlayPointerReaction extends PlayClick {
  delayMs: number
}

/**
 * How to undo a While hovering or While pressing reaction once the pointer leaves or lifts, and
 * the layer whose leaving undoes it: the layer the reaction ran from, or the instance it
 * switched when that layer went with the switch.
 */
export type PlayRevert =
  | {
      kind: 'change'
      watchId: string
      rootId: string
      instanceId: string
      from: string
      to: string
    }
  | { kind: 'overlay'; watchId: string; frameId: string }
  | { kind: 'back'; watchId: string; frameId: string }

/**
 * The layers under a point inside `rootId`, from the frame down to the deepest one `takes` the
 * pointer, any layer unless told otherwise; none outside.
 */
export function pointerPath(
  graph: SceneGraph,
  rootId: string,
  x: number,
  y: number,
  scroll?: ReadonlyMap<string, Vector>,
  takes?: (node: SceneNode) => boolean
): string[] {
  const path: string[] = []
  const deepest = playHitTest(graph, rootId, x, y, scroll, takes)
  if (!deepest) return path
  graph.closest(deepest.id, (node) => {
    path.unshift(node.id)
    return node.id === rootId
  })
  return path
}

/** The layers a pointer left, innermost first, and those it entered, outermost first. */
export function pathChanges(
  before: readonly string[],
  after: readonly string[]
): { left: string[]; entered: string[] } {
  let shared = 0
  while (shared < before.length && shared < after.length && before[shared] === after[shared]) {
    shared += 1
  }
  return { left: before.slice(shared).reverse(), entered: after.slice(shared) }
}

/**
 * Whether any layer of `rootId` reacts to the pointer moving over or pressing on it, an instance
 * by its variant; a frame without one is not hit-tested as the pointer moves.
 */
export function hasPointerTriggers(graph: SceneGraph, rootId: string): boolean {
  const reacts = (id: string): boolean => {
    const node = graph.getNode(id)
    if (!node) return false
    const own = effectiveReactions(graph, node).some((reaction) =>
      POINTER_TRIGGERS.has(reaction.trigger.type)
    )
    return own || node.childIds.some(reacts)
  }
  return reacts(rootId)
}

/** A layer's reactions to `trigger`, an instance's from the variant it shows, first action each. */
export function pointerReactions(
  graph: SceneGraph,
  nodeId: string,
  trigger: PrototypeTriggerType
): PlayPointerReaction[] {
  const node = graph.getNode(nodeId)
  if (!node) return []
  return effectiveReactions(graph, node).flatMap((reaction) => {
    const action = reaction.trigger.type === trigger ? primaryAction(reaction) : null
    if (!action) return []
    const transition = action.type === 'NODE' ? action.transition : null
    return [{ sourceId: nodeId, action, transition, delayMs: reaction.trigger.delay * 1000 }]
  })
}

/**
 * How to undo what a While hovering or While pressing reaction did: a Change to switches back, an
 * overlay it opened closes, a navigation goes back. Null when it changed nothing. `shown` is the
 * graph play shows the frame from after it ran.
 */
export function revertFor(
  before: PlaySession,
  done: PlayStep,
  { sourceId, action }: PlayClick,
  shown: SceneGraph
): PlayRevert | null {
  if (done.changed) {
    const { rootId, instanceId, from, to } = done.changed
    // A layer inside the instance went with the switch; leaving the instance undoes it then.
    const watchId = shown.getNode(sourceId) ? sourceId : instanceId
    return { kind: 'change', watchId, rootId, instanceId, from, to }
  }
  if (action.type !== 'NODE' || !action.nodeId) return null
  const after = done.session
  if (action.navigation === 'OVERLAY' && after.overlays.length > before.overlays.length) {
    return { kind: 'overlay', watchId: sourceId, frameId: action.nodeId }
  }
  if (action.navigation === 'NAVIGATE' && after.frameId !== before.frameId) {
    return { kind: 'back', watchId: sourceId, frameId: action.nodeId }
  }
  return null
}
