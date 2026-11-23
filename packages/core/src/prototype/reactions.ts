import { isEqual, omit } from 'es-toolkit'

import {
  generateId,
  type PrototypeReaction,
  type SceneGraph,
  type SceneNode
} from '@pairdraw/scene-graph'
import {
  findInstanceAncestor,
  instanceMainComponent,
  walkInstanceSources
} from '@pairdraw/scene-graph/instances'

/** Whether two reactions do the same thing, whatever their ids. */
export function sameReaction(a: PrototypeReaction, b: PrototypeReaction): boolean {
  return isEqual(omit(a, ['id']), omit(b, ['id']))
}

/**
 * The reactions play runs on a layer. An instance runs its main component's, so an interaction
 * set once on a variant works on every instance of it, and the instance's own reactions replace
 * the main's of the same trigger, as in Figma. A reaction an instance holds under one of its
 * main's ids is Figma's copy of it, which gives way to the main's as edited. Any other layer runs
 * its own.
 */
export function effectiveReactions(graph: SceneGraph, node: SceneNode): PrototypeReaction[] {
  return reactionsWithInherited(node, inheritedReactions(graph, node))
}

/**
 * A layer's reactions with the ones it inherits: the inherited reactions run unless the layer
 * overrides their trigger. Figma's copy of a main's interaction keeps the main's id; the main's
 * own, as edited, runs.
 */
export function reactionsWithInherited(
  node: SceneNode,
  inherited: readonly PrototypeReaction[]
): PrototypeReaction[] {
  if (inherited.length === 0) return node.prototypeReactions
  const own = node.prototypeReactions.filter(
    (reaction) => !inherited.some((main) => main.id === reaction.id)
  )
  return [
    ...own,
    ...inherited.filter(
      (reaction) => !own.some((mine) => mine.trigger.type === reaction.trigger.type)
    )
  ]
}

/**
 * The reactions a layer takes from its component: an instance root from the component it shows,
 * a layer inside an instance from the component layer it was copied from.
 */
function inheritedReactions(graph: SceneGraph, node: SceneNode): PrototypeReaction[] {
  if (node.type === 'INSTANCE') {
    return instanceMainComponent(graph, node)?.prototypeReactions ?? []
  }
  const source = componentLayer(graph, node)
  return source && source.id !== node.id ? source.prototypeReactions : []
}

/**
 * The component layer a copy stands for, followed through nested instances to the main that
 * finally holds it. A nested copy points at the layer one level up, not at the main's layer.
 */
export function componentLayer(graph: SceneGraph, node: SceneNode): SceneNode | undefined {
  return followComponentLayer(graph, node, (instance, copyId) =>
    copiedSource(graph, instance, copyId)
  )
}

/**
 * A resolver for the component layers copies stand for, which reads each instance's copy-to-main
 * map once. Arm many layers of one frame with it instead of calling `componentLayer` per layer,
 * which searches an instance for every copy.
 */
export function componentLayerResolver(
  graph: SceneGraph
): (node: SceneNode) => SceneNode | undefined {
  const sourcesByInstance = new Map<string, Map<string, SceneNode>>()
  const resolved = new Map<string, SceneNode | undefined>()
  const sourcesOf = (instance: SceneNode): Map<string, SceneNode> => {
    const cached = sourcesByInstance.get(instance.id)
    if (cached) return cached
    const sources = new Map<string, SceneNode>()
    walkInstanceSources(
      graph,
      instance,
      (source, copy) => {
        sources.set(copy.id, source)
        return true
      },
      true
    )
    sourcesByInstance.set(instance.id, sources)
    return sources
  }
  return (node) => {
    if (resolved.has(node.id)) return resolved.get(node.id)
    const layer = followComponentLayer(graph, node, (instance, copyId) =>
      sourcesOf(instance).get(copyId)
    )
    resolved.set(node.id, layer)
    return layer
  }
}

/** Walks a copy up to its main layer, one instance at a time, using `sourceOf` to map each step. */
function followComponentLayer(
  graph: SceneGraph,
  node: SceneNode,
  sourceOf: (instance: SceneNode, copyId: string) => SceneNode | undefined
): SceneNode | undefined {
  const seen = new Set<string>()
  let current = node
  for (;;) {
    if (seen.has(current.id)) return undefined
    seen.add(current.id)
    const owner = current.parentId ? findInstanceAncestor(graph, current.parentId) : undefined
    if (!owner) return current
    if (!instanceMainComponent(graph, owner)) return undefined
    const source = sourceOf(owner, current.id)
    if (!source || source.id === current.id) return undefined
    current = source
  }
}

/** The component layer that an instance's copy of `copyId` stands for. */
function copiedSource(
  graph: SceneGraph,
  instance: SceneNode,
  copyId: string
): SceneNode | undefined {
  let source: SceneNode | undefined
  walkInstanceSources(
    graph,
    instance,
    (candidate, copy) => {
      if (copy.id !== copyId) return true
      source = candidate
      return false
    },
    true
  )
  return source
}

/**
 * The instance's own reactions without the copies of `previousMain`'s: those under one of its ids,
 * or equal to one. Figma writes a main component's interactions onto each instance too; once play
 * shows another variant, those copies would keep running the old variant's interactions over the
 * new one's.
 */
export function withoutInheritedCopies(
  own: readonly PrototypeReaction[],
  previousMain: SceneNode | undefined
): PrototypeReaction[] {
  const inherited = previousMain?.prototypeReactions ?? []
  return own.filter(
    (reaction) => !inherited.some((main) => main.id === reaction.id || sameReaction(main, reaction))
  )
}

/**
 * The reaction an instance keeps after an edit. Figma's copy of a main's interaction keeps the
 * main's id, which play reads as the main's; edited to do something else, it takes an id of its
 * own and becomes the instance's override, which play runs.
 */
export function asInstanceEdit(
  reaction: PrototypeReaction,
  inherited: readonly PrototypeReaction[]
): PrototypeReaction {
  const main = inherited.find((candidate) => candidate.id === reaction.id)
  if (!main || sameReaction(main, reaction)) return reaction
  return { ...reaction, id: generateId() }
}
