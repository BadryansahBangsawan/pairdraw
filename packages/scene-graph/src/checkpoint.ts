import { isEqual } from 'es-toolkit'

import type { SceneGraph } from './graph'
import type { InstanceOverrideState } from './instances/overrides'
import type { SceneNode } from './types'

/**
 * The document state outside its layers, copied: variables, collections, modes, the instance and
 * connector indexes, libraries, images, and document metadata, which a rollback restores in place.
 */
function captureTables(graph: SceneGraph) {
  const variableRefs = new Map(graph.variables)
  const collectionRefs = new Map(graph.variableCollections)
  const snapshot = structuredClone({
    variables: graph.variables,
    variableCollections: graph.variableCollections,
    activeMode: graph.activeMode,
    instanceIndex: graph.instanceIndex,
    connectorIds: graph.connectorIds,
    enabledLibraries: graph.enabledLibraries,
    rootId: graph.rootId,
    documentKind: graph.documentKind,
    figKiwiVersion: graph.figKiwiVersion,
    figSchemaDeflated: graph.figSchemaDeflated,
    documentColorSpace: graph.documentColorSpace
  })
  // Atomic property tools cannot edit assets. Retain existing buffers, not copies of every bitmap.
  const images = new Map(graph.images)

  function assertVariablesKept() {
    for (const [id, before] of snapshot.variables) {
      const after = graph.variables.get(id)
      if (
        !after ||
        after !== variableRefs.get(id) ||
        before.id !== after.id ||
        before.collectionId !== after.collectionId ||
        before.type !== after.type
      )
        throw new Error('Atomic tools must not change variable identity')
    }
  }

  function assertDocumentUnchanged() {
    if (
      !isEqual(snapshot.variableCollections, graph.variableCollections) ||
      !isEqual(snapshot.activeMode, graph.activeMode) ||
      !isEqual(snapshot.instanceIndex, graph.instanceIndex) ||
      !isEqual(snapshot.enabledLibraries, graph.enabledLibraries) ||
      images.size !== graph.images.size ||
      [...images].some(([id, bytes]) => graph.images.get(id) !== bytes) ||
      graph.rootId !== snapshot.rootId ||
      graph.documentKind !== snapshot.documentKind ||
      graph.documentColorSpace !== snapshot.documentColorSpace ||
      graph.figKiwiVersion !== snapshot.figKiwiVersion ||
      !isEqual(graph.figSchemaDeflated, snapshot.figSchemaDeflated)
    ) {
      throw new Error('Atomic tools must not change collections, assets or document metadata')
    }
  }

  function restore() {
    restoreObjects(graph.variables, snapshot.variables, variableRefs)
    restoreObjects(graph.variableCollections, snapshot.variableCollections, collectionRefs)
    restoreMap(graph.activeMode, structuredClone(snapshot.activeMode))
    restoreMap(graph.instanceIndex, structuredClone(snapshot.instanceIndex))
    graph.connectorIds.clear()
    for (const id of snapshot.connectorIds) graph.connectorIds.add(id)
    restoreMap(graph.enabledLibraries, structuredClone(snapshot.enabledLibraries))
    restoreMap(graph.images, images)
    graph.rootId = snapshot.rootId
    graph.documentKind = snapshot.documentKind
    graph.figKiwiVersion = snapshot.figKiwiVersion
    graph.figSchemaDeflated = structuredClone(snapshot.figSchemaDeflated)
    graph.documentColorSpace = snapshot.documentColorSpace
  }

  return {
    variables: snapshot.variables,
    variableCount: snapshot.variables.size,
    assertVariablesKept,
    assertDocumentUnchanged,
    restore
  }
}

function assertSameNodes(graph: SceneGraph, refs: Map<string, SceneNode>, variableCount: number) {
  if (refs.size !== graph.nodes.size || variableCount !== graph.variables.size)
    throw new Error('Atomic tools must not create or remove nodes or variables')
}

function assertHierarchyKept(
  graph: SceneGraph,
  refs: Map<string, SceneNode>,
  before: SceneNode,
  id: string
) {
  const after = graph.nodes.get(id)
  if (
    !after ||
    after !== refs.get(id) ||
    before.id !== after.id ||
    before.type !== after.type ||
    before.parentId !== after.parentId ||
    before.componentId !== after.componentId ||
    !isEqual(before.childIds, after.childIds)
  ) {
    throw new Error('Atomic tools must not change node hierarchy or identity')
  }
}

/**
 * Lets consumers know the restored hierarchy and indexes, once all of it is in place: removed
 * layers first, then the layers put back, then `changed` ones.
 */
function announceRestore(
  graph: SceneGraph,
  failedNodes: Map<string, SceneNode>,
  changed: Iterable<string>
) {
  for (const [id, node] of failedNodes) {
    if (!graph.nodes.has(id)) graph.emitter.emit('node:deleted', id, node.parentId)
  }
  for (const id of changed) {
    const node = graph.nodes.get(id)
    if (node && failedNodes.has(id)) graph.emitter.emit('node:updated', id, node)
  }
  for (const node of graph.nodes.values()) {
    if (!failedNodes.has(node.id)) graph.emitter.emit('node:created', node)
  }
}

/** Capture rollback state without changing graph or surviving object identities. */
export function captureGraphCheckpoint(graph: SceneGraph) {
  const nodeRefs = new Map(graph.nodes)
  const nodes = structuredClone(graph.nodes)
  const tables = captureTables(graph)

  function assertPropertiesOnly() {
    assertSameNodes(graph, nodeRefs, tables.variableCount)
    for (const [id, before] of nodes) assertHierarchyKept(graph, nodeRefs, before, id)
    tables.assertVariablesKept()
    tables.assertDocumentUnchanged()
  }

  function restore() {
    const failedNodes = new Map(graph.nodes)
    restoreObjects(graph.nodes, nodes, nodeRefs)
    tables.restore()
    graph.clearAbsPosCache()
    announceRestore(graph, failedNodes, graph.nodes.keys())
  }

  return { nodes, variables: tables.variables, assertPropertiesOnly, restore }
}

function copyOverrides(state: InstanceOverrideState): InstanceOverrideState {
  return {
    self: new Map(state.self),
    descendants: new Map([...state.descendants].map(([id, fields]) => [id, new Map(fields)]))
  }
}

/**
 * A layer's fields as they are, sharing their values, with the parts the graph edits in place
 * (child list, source metadata, override maps) copied, as undo recording copies a page.
 */
function referenceCopy(node: SceneNode): SceneNode {
  const { source } = node
  return {
    ...node,
    childIds: [...node.childIds],
    source: { ...source, fig: { ...source.fig, rawNodeFields: { ...source.fig.rawNodeFields } } },
    instanceOverrides: copyOverrides(node.instanceOverrides)
  }
}

function keyCount(value: object): number {
  let count = 0
  for (const key in value) if (Object.hasOwn(value, key)) count++
  return count
}

/**
 * Whether `current` holds the same keys as `saved`, each with the same value, except `skip`;
 * `savedKeys` is how many keys `saved` has, when already counted.
 */
function sameFields<T extends object>(
  current: T,
  saved: T,
  skip?: ReadonlySet<string>,
  savedKeys = keyCount(saved)
): boolean {
  let currentKeys = 0
  for (const key in current) {
    if (!Object.hasOwn(current, key)) continue
    currentKeys++
    if (skip?.has(key)) continue
    if (current[key] !== saved[key]) return false
  }
  return currentKeys === savedKeys
}

function sameMap<K, V>(current: Map<K, V>, saved: Map<K, V>): boolean {
  if (current.size !== saved.size) return false
  for (const [key, value] of current) if (saved.get(key) !== value) return false
  return true
}

const COPIED_FIELDS: ReadonlySet<string> = new Set(['childIds', 'source', 'instanceOverrides'])
const SOURCE_FIG: ReadonlySet<string> = new Set(['fig'])
const FIG_RAW_FIELDS: ReadonlySet<string> = new Set(['rawNodeFields'])

/** A layer's reference copy, and how many fields it has. */
interface Reference {
  node: SceneNode
  fields: number
}

/** Whether anything of `node` differs from its reference copy, even written in place. */
function differs(node: SceneNode, { node: saved, fields }: Reference): boolean {
  const { source, instanceOverrides: overrides } = node
  const savedOverrides = saved.instanceOverrides
  return !(
    sameFields(node, saved, COPIED_FIELDS, fields) &&
    isEqual(node.childIds, saved.childIds) &&
    sameFields(source, saved.source, SOURCE_FIG) &&
    sameFields(source.fig, saved.source.fig, FIG_RAW_FIELDS) &&
    sameFields(source.fig.rawNodeFields, saved.source.fig.rawNodeFields) &&
    sameMap(overrides.self, savedOverrides.self) &&
    overrides.descendants.size === savedOverrides.descendants.size &&
    [...overrides.descendants].every(([id, fields]) => {
      const savedFields = savedOverrides.descendants.get(id)
      return savedFields !== undefined && sameMap(fields, savedFields)
    })
  )
}

/**
 * Rollback state for an edit that may only change properties, costing what the edit touches:
 * every layer is kept by reference (its values shared, the parts the graph edits in place
 * copied), and a layer the graph announces with `willChangeNode` is deep-copied before it
 * changes. A layer written without that announcement is still caught and restored as long as
 * its values were replaced rather than written into, as the graph's contract asks. The other
 * tables are copied whole, as `captureGraphCheckpoint` does. Call `release` when done.
 */
export function captureEditCheckpoint(graph: SceneGraph) {
  const nodeRefs = new Map(graph.nodes)
  const references = new Map<string, Reference>()
  for (const [id, node] of nodeRefs) {
    const copy = referenceCopy(node)
    references.set(id, { node: copy, fields: keyCount(copy) })
  }
  // Deep copies of announced layers, taken before they change.
  const announced = new Map<string, SceneNode>()
  const release = graph.observeNodeChanges({
    created: () => undefined,
    before: (node) => {
      const saved = references.get(node.id)
      if (saved && !announced.has(node.id)) announced.set(node.id, structuredClone(saved.node))
    }
  })
  const tables = captureTables(graph)

  /** Each layer the edit changed so far, as it was before: announced ones and any other. */
  function changedNodes(): Map<string, SceneNode> {
    const changed = new Map(announced)
    for (const [id, node] of graph.nodes) {
      const saved = references.get(id)
      if (saved && !changed.has(id) && differs(node, saved)) changed.set(id, saved.node)
    }
    return changed
  }

  /** Throws unless the edit only changed properties; returns what it changed, as `changedNodes`. */
  function assertPropertiesOnly(): Map<string, SceneNode> {
    assertSameNodes(graph, nodeRefs, tables.variableCount)
    for (const [id, ref] of nodeRefs) {
      if (graph.nodes.get(id) !== ref)
        throw new Error('Atomic tools must not change node hierarchy or identity')
    }
    const changed = changedNodes()
    for (const [id, before] of changed) assertHierarchyKept(graph, nodeRefs, before, id)
    tables.assertVariablesKept()
    tables.assertDocumentUnchanged()
    return changed
  }

  function restore() {
    const changed = changedNodes()
    const failedNodes = new Map(graph.nodes)
    graph.nodes.clear()
    for (const [id, node] of nodeRefs) graph.nodes.set(id, node)
    for (const [id, saved] of changed) {
      const node = nodeRefs.get(id)
      if (!node) continue
      for (const key of Object.keys(node) as (keyof SceneNode)[]) {
        if (!(key in saved)) Reflect.deleteProperty(node, key)
      }
      // A deep copy is the checkpoint's own; a reference copy holds the values the layer had.
      Object.assign(node, announced.has(id) ? structuredClone(saved) : saved)
    }
    tables.restore()
    graph.clearAbsPosCache()
    announceRestore(graph, failedNodes, changed.keys())
  }

  return { variables: tables.variables, changedNodes, assertPropertiesOnly, restore, release }
}

function restoreObjects<T extends object>(
  target: Map<string, T>,
  snapshot: Map<string, T>,
  refs: Map<string, T>
) {
  target.clear()
  for (const [id, saved] of snapshot) {
    const original = refs.get(id)
    if (!original) throw new Error(`Missing checkpoint reference: ${id}`)
    for (const key of Object.keys(original) as (keyof T)[]) {
      if (!(key in saved)) Reflect.deleteProperty(original, key)
    }
    Object.assign(original, structuredClone(saved))
    target.set(id, original)
  }
}

function restoreMap<K, V>(target: Map<K, V>, saved: Map<K, V>) {
  target.clear()
  for (const [key, value] of saved) target.set(key, value)
}
