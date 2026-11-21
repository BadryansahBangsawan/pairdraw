import { isEqual, pick } from 'es-toolkit'

import { cloneNodeProps } from '../copy'
import { MAIN_COMPONENT_FIELDS, PARENT_LAYOUT_FIELDS, TRANSFORM_FIELDS } from '../fields'
import type { SceneGraph } from '../graph'
import { findInstanceAncestor, retargetCopiedOverrides } from '../instances'
import { readPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import type { NodeType, PrototypeReaction, SceneNode } from '../types'
import { withStandIn } from './copy'
import { matchLayers } from './match'
import { variationSetOf, versionOf, type VariationSetView } from './model'

/** Why a version cannot replace its original. */
export type VariationPickProblem =
  | 'not-in-set'
  | 'not-a-version'
  | 'original-missing'
  | 'original-in-instance'
  | 'original-locked'
  | 'version-type-differs'

const PROBLEM_MESSAGES: Record<VariationPickProblem, (nodeId: string) => string> = {
  'not-in-set': (nodeId) => `"${nodeId}" is not in a set of variations`,
  'not-a-version': (nodeId) => `"${nodeId}" is not a version: pick one of the set's layers`,
  'original-missing': () => 'The layer these are variations of is gone; discard them instead',
  'original-in-instance': () =>
    'The layer these are variations of is inside an instance; vary the instance or its main component',
  'original-locked': () =>
    'The layer these are variations of is locked; unlock it to replace it with a version',
  'version-type-differs': () =>
    'This version is a different kind of layer than the original (such as a frame for an ' +
    'instance), so it cannot replace it; change the layers inside a version instead of ' +
    'replacing the version, or make a new version'
}

/** A layer that belongs to no set, or a version that cannot be used, with the reason. */
export class VariationError extends Error {
  constructor(
    readonly problem: VariationPickProblem,
    nodeId: string
  ) {
    super(PROBLEM_MESSAGES[problem](nodeId))
    this.name = 'VariationError'
  }
}

/** Never taken from a version: what places a layer in the tree, who it is, and its review. */
const OWN_FIELDS: ReadonlySet<string> = new Set<keyof SceneNode>([
  'id',
  'parentId',
  'childIds',
  'source',
  'status'
])

/** What the original keeps of its own place: its name, where it sits, and how it is shown. */
const ORIGINAL_PLACE_FIELDS: ReadonlySet<string> = new Set<keyof SceneNode>([
  'name',
  ...TRANSFORM_FIELDS.filter((field) => field !== 'flipX' && field !== 'flipY'),
  ...PARENT_LAYOUT_FIELDS,
  'visible',
  'locked'
])

/** What a main component original keeps: being a component, and its properties and publishing. */
const MAIN_COMPONENT_KEPT: ReadonlySet<string> = new Set<keyof SceneNode>([
  'type',
  ...MAIN_COMPONENT_FIELDS
])

function standInMark(node: SceneNode | undefined): string | undefined {
  return node ? readPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.variationStandIn) : undefined
}

/** Removes stand-in marks from a layer moving into the original, and from its layers. */
function clearStandInMarks(graph: SceneGraph, rootId: string): void {
  for (const node of subtree(graph, rootId)) {
    if (standInMark(node) !== undefined) {
      graph.updateNode(node.id, { pluginData: withStandIn(node, null) })
    }
  }
}

/** The layer at `rootId` and every layer inside it. */
function* subtree(graph: SceneGraph, rootId: string): Generator<SceneNode> {
  const pending = [rootId]
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const node = graph.getNode(id)
    if (!node) continue
    pending.push(...node.childIds)
    yield node
  }
}

function isMain(node: SceneNode | undefined): boolean {
  return node?.type === 'COMPONENT' || node?.type === 'COMPONENT_SET'
}

/** Whether a version whose root is `version` may replace an original of type `original`. */
function replaces(version: NodeType, original: NodeType): boolean {
  // A main component's versions are frames.
  return version === original || (original === 'COMPONENT' && version === 'FRAME')
}

/** Why `versionId` cannot replace the original of `view`, or null when it can. */
export function variationPickProblem(
  graph: SceneGraph,
  view: VariationSetView,
  versionId: string
): VariationPickProblem | null {
  const version = graph.getNode(versionId)
  if (version?.parentId !== view.section.id) return 'not-a-version'
  const { original } = view
  if (!original) return 'original-missing'
  if (original.parentId && findInstanceAncestor(graph, original.parentId)) {
    return 'original-in-instance'
  }
  if (original.locked) return 'original-locked'
  return replaces(version.type, original.type) ? null : 'version-type-differs'
}

/**
 * The set and version `versionId` names, a version or a layer inside one, and why it cannot
 * replace its original, or null when it can. Throws when `versionId` is in no set's versions.
 */
export function variationToPick(
  graph: SceneGraph,
  versionId: string
): { view: VariationSetView; version: SceneNode; problem: VariationPickProblem | null } {
  const view = variationSetOf(graph, versionId)
  if (!view) throw new VariationError('not-in-set', versionId)
  const version = versionOf(graph, view, versionId)
  if (!version) throw new VariationError('not-a-version', versionId)
  return { view, version, problem: variationPickProblem(graph, view, version.id) }
}

/**
 * The version's fields that differ from what `original` holds, as `original` takes them, or null
 * when none do, so an unchanged layer gets no update at all.
 */
function changedFields(
  versionLayer: SceneNode,
  original: SceneNode,
  isRoot: boolean
): Partial<SceneNode> | null {
  // A stand-in mark stays with the version's layer; the original never takes it.
  const version =
    standInMark(versionLayer) === undefined
      ? versionLayer
      : { ...versionLayer, pluginData: withStandIn(versionLayer, null) }
  const kept = (key: string) =>
    OWN_FIELDS.has(key) ||
    (isRoot && ORIGINAL_PLACE_FIELDS.has(key)) ||
    (isRoot && original.type === 'COMPONENT' && MAIN_COMPONENT_KEPT.has(key))
  const keys = (Object.keys(version) as (keyof SceneNode)[]).filter(
    (key) => version[key] !== original[key] && !kept(key) && !isEqual(version[key], original[key])
  )
  return keys.length > 0 ? pick(cloneNodeProps(version, null), keys) : null
}

function renamedReactions(
  reactions: PrototypeReaction[],
  rename: (id: string) => string
): PrototypeReaction[] | null {
  const renamed = (action: PrototypeReaction['actions'][number]) =>
    action.type === 'NODE' && action.nodeId !== null && rename(action.nodeId) !== action.nodeId
  if (!reactions.some((reaction) => reaction.actions.some(renamed))) return null
  return reactions.map((reaction) => ({
    ...reaction,
    actions: reaction.actions.map((action) =>
      action.type === 'NODE' && action.nodeId !== null
        ? { ...action, nodeId: rename(action.nodeId) }
        : action
    )
  }))
}

/**
 * Points what the kept layers say about each other, connector ends and prototype targets, at
 * the original's layers where they named the version's.
 */
function renameReferences(graph: SceneGraph, rootId: string, pairs: ReadonlyMap<string, string>) {
  const rename = (id: string) => pairs.get(id) ?? id
  for (const node of subtree(graph, rootId)) {
    const changes: Partial<SceneNode> = {}
    for (const end of ['connectorStart', 'connectorEnd'] as const) {
      const endpoint = node[end]
      if (endpoint?.nodeId && pairs.has(endpoint.nodeId)) {
        changes[end] = { ...endpoint, nodeId: rename(endpoint.nodeId) }
      }
    }
    const reactions = renamedReactions(node.prototypeReactions, rename)
    if (reactions) changes.prototypeReactions = reactions
    if (Object.keys(changes).length > 0) graph.updateNode(node.id, changes)
  }
}

/**
 * Gives `originalLayer` the children of `versionLayer`, in its order: paired layers stay, layers
 * only the version has move in, and layers only the original had go, apart from main components
 * and sets, which keep their place. Returns the pairs to visit next.
 */
function applyChildren(
  graph: SceneGraph,
  pairs: ReadonlyMap<string, string>,
  paired: ReadonlySet<string>,
  versionLayer: SceneNode,
  originalLayer: SceneNode
): Array<[string, string]> {
  const originalChildren = [...originalLayer.childIds]
  // A main component or set is never deleted: instances elsewhere draw from it.
  const keptMains = originalChildren.flatMap((childId, index) =>
    !paired.has(childId) && isMain(graph.getNode(childId)) ? [{ childId, index }] : []
  )
  const unpaired = originalChildren.filter(
    (childId) => !paired.has(childId) && !isMain(graph.getNode(childId))
  )
  for (const childId of unpaired) graph.deleteNode(childId)

  const next: Array<[string, string]> = []
  const order: string[] = []
  for (const childId of versionLayer.childIds) {
    const pairedId = pairs.get(childId)
    // A stand-in for a component the document no longer has stands for nothing; any other
    // marked layer moving in is an ordinary layer, such as a copy of a stand-in.
    const mark = pairedId === undefined ? standInMark(graph.getNode(childId)) : undefined
    if (mark !== undefined && !graph.getNode(mark)) continue
    order.push(pairedId ?? childId)
    if (pairedId === undefined) clearStandInMarks(graph, childId)
    // A main component's stand-in leaves the component as it is (`standsIn`).
    else if (graph.getNode(childId)?.type === graph.getNode(pairedId)?.type) {
      next.push([childId, pairedId])
    }
  }
  // A kept main component keeps its place among the layers.
  for (const { childId, index } of keptMains) order.splice(index, 0, childId)
  order.forEach((target, index) => {
    // Read the list afresh: a move replaces it. A layer already in place is not moved.
    if (graph.getNode(originalLayer.id)?.childIds[index] !== target) {
      graph.insertChildAt(target, originalLayer.id, index)
    }
  })
  return next
}

/**
 * Makes the original of the set holding `versionId` look like that version, then removes the
 * set. The original keeps its id, name, place among its siblings, and how its parent lays it
 * out, and so does every layer of it that pairs with one of the version's (`matchLayers`), so
 * what points at them keeps working; layers only the version has move in, and layers only the
 * original had are deleted, apart from main components and sets, which are kept as they are,
 * as when the version holds their stand-ins. Only fields that differ are written and only layers out of place
 * are moved, so a pick sends no more changes than it makes. A main component stays one, keeping
 * its properties and publishing. Comments stay pinned where they were; one on a removed version
 * falls back to its stored point, as on any deleted layer. The caller records the edit as one step and lays out the original and its parent.
 */
export function applyVariation(graph: SceneGraph, versionId: string): { originalId: string } {
  const { view, version, problem } = variationToPick(graph, versionId)
  if (problem || !view.original) throw new VariationError(problem ?? 'original-missing', versionId)
  const original = view.original

  const pairs = matchLayers(graph, original.id, version.id)
  const paired = new Set(pairs.values())
  const pending: Array<[string, string]> = [[version.id, original.id]]
  // Pairs are appended while the list is walked, parents before their children.
  for (const [versionLayerId, originalLayerId] of pending) {
    const versionLayer = graph.getNode(versionLayerId)
    const originalLayer = graph.getNode(originalLayerId)
    if (!versionLayer || !originalLayer) continue
    const changes = changedFields(versionLayer, originalLayer, originalLayerId === original.id)
    if (changes) graph.updateNode(originalLayerId, changes)
    pending.push(...applyChildren(graph, pairs, paired, versionLayer, originalLayer))
  }

  // Instances among the kept layers record overrides of the version's layers; they are the
  // original's now.
  retargetCopiedOverrides(graph, pairs)
  renameReferences(graph, original.id, pairs)
  graph.deleteNode(view.section.id)
  return { originalId: original.id }
}

/** Removes the set holding `nodeId` and every version in it; the original is left as it is. */
export function discardVariations(
  graph: SceneGraph,
  nodeId: string
): { originalId: string | null } {
  const view = variationSetOf(graph, nodeId)
  if (!view) throw new VariationError('not-in-set', nodeId)
  graph.deleteNode(view.section.id)
  return { originalId: view.original?.id ?? null }
}
