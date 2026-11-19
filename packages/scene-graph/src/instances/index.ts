import type { NodeCloneMode } from '../copy'
import type { SceneGraph } from '../graph'
import { slotScope } from '../slots/content'
import { detachOwnedSlotContent, restoreOwnedSlotContent } from '../slots/frames'
import type { SceneNode } from '../types'
import { keepOwnContentSize } from './content-size'
import { createInstanceSyncContext, groupCopyRemovals, removeLeftoverCopies } from './copies'
import { canCreateInstance, createsComponentCycle } from './cycles'
import { INSTANCE_OVERRIDE_FIELDS, INSTANCE_SYNC_PROPS } from './fields'
import { differingVariableModeCollections } from './modes'
import {
  assignmentOverrideField,
  cloneInstanceOverrideState,
  copiedComponentLayerId,
  createInstanceOverrideState,
  getInstanceOverride,
  hasInstanceOverride as hasNodeInstanceOverride,
  overriddenAssignmentId,
  REPLACED_LAYER_OVERRIDE,
  setInstanceOverride,
  variableModeOverrideField
} from './overrides'
import { owningInstance, replacedLayerIn } from './replacements'
import { walkInstanceSources } from './source-walk'
import {
  bindingProtection,
  cloneChildrenWithMapping,
  copyProp,
  enclosingInstanceOverrideFields,
  isProtectedSyncField,
  sourceInTargetCoordinates,
  syncBindingFields,
  syncChildren,
  syncVariableModeFields,
  updateSyncedProps
} from './sync'

export { canCreateInstance, createsComponentCycle, cycleSafeParent } from './cycles'
export { instanceMainComponent } from './main-component'
export {
  isInShownReplacedLayer,
  isReplacedLayer,
  owningInstance,
  replacedComponentLayerId,
  showsReplacedLayer
} from './replacements'
export {
  INSTANCE_FOLLOWED_FIELDS,
  INSTANCE_OVERRIDE_FIELDS,
  INSTANCE_SYNC_FIELDS,
  INSTANCE_SYNC_PROPS,
  INSTANCE_SYNC_TEXT_PROPS
} from './fields'

export function copyInstanceComponentProps(component: SceneNode): Partial<SceneNode> {
  const props: Partial<SceneNode> = {}
  for (const key of INSTANCE_SYNC_PROPS) copyProp(props, component, key)
  return props
}

/**
 * The name Figma gives a new instance of `component`: its component set's name for a variant,
 * whose own name only says which variant it is, and the component's own name otherwise.
 */
function instanceComponentName(graph: SceneGraph, component: SceneNode): string {
  const parent = component.parentId ? graph.nodes.get(component.parentId) : undefined
  return parent?.type === 'COMPONENT_SET' ? parent.name : component.name
}

export function createInstance(
  graph: SceneGraph,
  componentId: string,
  parentId: string,
  overrides: Partial<SceneNode> = {}
): SceneNode | null {
  const component = graph.nodes.get(componentId)
  if (component?.type !== 'COMPONENT' || !canCreateInstance(graph, componentId, parentId))
    return null

  const props: Partial<SceneNode> = {
    ...copyInstanceComponentProps(component),
    name: instanceComponentName(graph, component)
  }

  // The component checked above is the one the instance shows, whatever `overrides` holds.
  const instance = graph.createNode('INSTANCE', parentId, { ...props, ...overrides, componentId })

  cloneChildrenWithMapping(graph, component.id, instance.id)

  return instance
}

export function populateInstanceChildren(
  graph: SceneGraph,
  instanceId: string,
  componentId: string,
  mode: NodeCloneMode = 'deep'
): void {
  const instance = graph.nodes.get(instanceId)
  const component = graph.nodes.get(componentId)
  if (!instance || !component || instance.type !== 'INSTANCE') return
  cloneChildrenWithMapping(graph, componentId, instanceId, mode)
}

/**
 * A nested instance's link to the enclosing component's record is its `componentId` when it
 * was populated by cloning. A swap replaces that field, so keep the correspondence as the
 * owner's `sourceComponentId` override and record the swap itself; materialized documents
 * already carry the correspondence and only gain the swap.
 */
function recordNestedSwap(graph: SceneGraph, instance: SceneNode, componentId: string): void {
  const owner = instance.parentId ? findInstanceAncestor(graph, instance.parentId) : undefined
  if (!owner) return
  const existing = getInstanceOverride(
    owner.instanceOverrides,
    owner.id,
    instance.id,
    'sourceComponentId'
  )
  if (typeof existing !== 'string' && instance.componentId)
    setInstanceOverride(
      owner.instanceOverrides,
      owner.id,
      instance.id,
      'sourceComponentId',
      instance.componentId
    )
  setInstanceOverride(owner.instanceOverrides, owner.id, instance.id, 'componentId', componentId)
  graph.updateNode(owner.id, { instanceOverrides: owner.instanceOverrides })
}

export interface SwapInstanceOptions {
  /**
   * Keep the instance's name even when it is its old component's. A swap otherwise renames such
   * an instance after the new component, as Figma does; a view that only shows another variant,
   * such as preview, keeps names so layer paths stay the same.
   */
  keepName?: boolean
}

export function swapInstanceComponent(
  graph: SceneGraph,
  instanceId: string,
  componentId: string,
  { keepName = false }: SwapInstanceOptions = {}
): void {
  const instance = graph.nodes.get(instanceId)
  const component = graph.nodes.get(componentId)
  if (!instance || component?.type !== 'COMPONENT' || instance.type !== 'INSTANCE') return
  if (instance.parentId && !canCreateInstance(graph, componentId, instance.parentId)) return

  const previousComponent = instance.componentId ? graph.nodes.get(instance.componentId) : undefined
  recordNestedSwap(graph, instance, componentId)
  const updates: Partial<SceneNode> = { componentId }
  const source = sourceInTargetCoordinates(component, instance.componentScale)
  const overridden = (field: string) =>
    hasNodeInstanceOverride(instance.instanceOverrides, instance.id, instance.id, field)
  for (const key of INSTANCE_SYNC_PROPS) {
    if (key === 'variableModes' || overridden(key)) continue
    copyProp(updates, source, key)
  }
  syncVariableModeFields(instance, source, updates, overridden)

  if (
    !keepName &&
    (!previousComponent || instance.name === instanceComponentName(graph, previousComponent))
  )
    updates.name = instanceComponentName(graph, component)

  const childIds = Array.from(instance.childIds)
  const slotContent = detachOwnedSlotContent(graph, instance)
  for (const childId of childIds) {
    // The clones take new IDs, so what was recorded for the removed layers would never apply.
    forgetOverridesOf(graph, childId)
    graph.deleteNode(childId)
  }
  graph.updateNode(instanceId, updates)
  cloneChildrenWithMapping(graph, componentId, instanceId)
  restoreOwnedSlotContent(graph, instance, slotContent)
}

const syncingComponentsByGraph = new WeakMap<SceneGraph, Set<string>>()

export function syncInstances(graph: SceneGraph, componentId: string): void {
  syncInstancesOf(graph, componentId, getInstances(graph, componentId))
}

/**
 * Syncs each component's instances, in order, as one edit: the copies they remove stay
 * restorable together for as long as undo keeps that edit.
 */
export function syncInstancesTogether(graph: SceneGraph, componentIds: Iterable<string>): void {
  groupCopyRemovals(graph, () => {
    for (const id of componentIds) syncInstances(graph, id)
  })
}

/** Syncs one instance from its component, as `syncInstances` does for every instance. */
export function syncInstance(graph: SceneGraph, instanceId: string): void {
  const instance = graph.nodes.get(instanceId)
  if (instance?.type !== 'INSTANCE' || !instance.componentId) return
  syncInstancesOf(graph, instance.componentId, [instance])
}

function syncInstancesOf(
  graph: SceneGraph,
  componentId: string,
  instances: Iterable<SceneNode>
): void {
  const component = graph.nodes.get(componentId)
  if (component?.type !== 'COMPONENT') return
  let syncing = syncingComponentsByGraph.get(graph)
  if (!syncing) {
    syncing = new Set()
    syncingComponentsByGraph.set(graph, syncing)
  }
  if (syncing.has(componentId)) return
  syncing.add(componentId)
  try {
    groupCopyRemovals(graph, (removals) => {
      for (const instance of instances) {
        const enclosing = enclosingInstanceOverrideFields(graph, instance)
        enclosing.push(new Set(instance.instanceOverrides.self.keys()))
        const protectedField = bindingProtection(enclosing)
        const source = sourceInTargetCoordinates(component, instance.componentScale)
        const updates: Partial<SceneNode> = {}
        syncBindingFields(instance, source, updates, protectedField)
        syncVariableModeFields(instance, source, updates, protectedField)
        for (const key of INSTANCE_SYNC_PROPS) {
          if (key === 'boundVariables' || key === 'variableModes') continue
          if (isProtectedSyncField(instance, key, protectedField)) continue
          copyProp(updates, source, key)
        }
        // An instance that hugs its layers sizes to what it shows, not to the component.
        keepOwnContentSize(graph, updates, instance, source)
        updateSyncedProps(graph, instance, updates, (key) =>
          isProtectedSyncField(instance, key, protectedField)
        )
        const context = createInstanceSyncContext(instance.id, instance.instanceOverrides)
        syncChildren(graph, component.id, instance.id, instance.instanceOverrides, context)
        removeLeftoverCopies(graph, context, removals)
      }
    })
  } finally {
    syncing.delete(componentId)
  }
}

/**
 * Renames the layers that the copied instances among `copies` record overrides for to their
 * copies, as a copied instance records its own layers' overrides. The values keep naming what
 * they name, since a copy shows the same components as its source.
 */
export function retargetCopiedOverrides(
  graph: SceneGraph,
  copies: ReadonlyMap<string, string>
): void {
  for (const id of copies.values()) {
    const node = graph.nodes.get(id)
    if (node?.type !== 'INSTANCE' || node.instanceOverrides.descendants.size === 0) continue
    const descendants = new Map(
      [...node.instanceOverrides.descendants].map(([target, fields]) => [
        copies.get(target) ?? target,
        fields
      ])
    )
    graph.updateNode(id, { instanceOverrides: { ...node.instanceOverrides, descendants } })
  }
}

export function detachInstance(graph: SceneGraph, instanceId: string): void {
  const node = graph.nodes.get(instanceId)
  if (node?.type !== 'INSTANCE') return
  for (const nested of outermostNestedInstances(graph, node))
    adoptNestedOverrides(graph, node, nested)
  // Through `updateNode`, so the instance index, change observers, and undo recorders see it.
  graph.updateNode(instanceId, {
    type: 'FRAME',
    componentId: null,
    instanceOverrides: createInstanceOverrideState()
  })
}

// A swap's bookkeeping belongs to the instance enclosing the swapped one, never to the swapped one.
const OWNER_ONLY_FIELDS = new Set(['componentId', 'sourceComponentId'])

function outermostNestedInstances(graph: SceneGraph, instance: SceneNode): SceneNode[] {
  return graph
    .getChildren(instance.id)
    .flatMap((child) =>
      child.type === 'INSTANCE' ? [child] : outermostNestedInstances(graph, child)
    )
}

/**
 * An instance a detached one holds stands on its own once that one is a frame, and so must what
 * makes it differ from its component. Cloned in, it kept the overrides of the instance it copies,
 * under that instance's layers; those, and the ones the detached instance recorded on its layers,
 * now go under its own.
 */
function adoptNestedOverrides(graph: SceneGraph, detached: SceneNode, nested: SceneNode): void {
  const ownLayer = new Map<string, string>()
  walkInstanceSources(graph, nested, (source, target) => {
    ownLayer.set(source.id, target.id)
    return true
  })
  const { self, descendants: kept } = cloneInstanceOverrideState(nested.instanceOverrides)
  const outer = cloneInstanceOverrideState(detached.instanceOverrides).descendants
  const descendants = new Map<string, Map<string, unknown>>()
  const claim = (layerId: string, fields: Map<string, unknown>): void => {
    const merged = descendants.get(layerId)
    if (!merged) descendants.set(layerId, fields)
    else for (const [field, value] of fields) merged.set(field, value)
  }
  // What was recorded on its own layers is more recent than what it copied, so it is laid on top.
  for (const [layerId, fields] of kept)
    if (ownLayer.has(layerId)) claim(ownLayer.get(layerId) ?? layerId, fields)
  for (const [layerId, fields] of kept) if (!ownLayer.has(layerId)) claim(layerId, fields)
  for (const [layerId, fields] of outer) {
    if (layerId === nested.id) {
      for (const [field, value] of fields) if (!OWNER_ONLY_FIELDS.has(field)) self.set(field, value)
    } else if (graph.isDescendant(layerId, nested.id)) claim(layerId, fields)
  }
  graph.updateNode(nested.id, { instanceOverrides: { self, descendants } })
}

export function getMainComponent(graph: SceneGraph, instanceId: string): SceneNode | undefined {
  const node = graph.nodes.get(instanceId)
  if (!node?.componentId) return undefined
  return graph.nodes.get(node.componentId)
}

export function getInstances(graph: SceneGraph, componentId: string): SceneNode[] {
  const ids = graph.instanceIndex.get(componentId)
  if (!ids) return []
  const instances: SceneNode[] = []
  for (const id of ids) {
    const node = graph.nodes.get(id)
    if (node) instances.push(node)
  }
  return instances
}

/** Nearest INSTANCE at or above `nodeId` — self, parent, grandparent, etc. */
export function findInstanceAncestor(graph: SceneGraph, nodeId: string): SceneNode | undefined {
  let current = graph.nodes.get(nodeId)
  while (current) {
    if (current.type === 'INSTANCE') return current
    current = current.parentId ? graph.nodes.get(current.parentId) : undefined
  }
  return undefined
}

/**
 * True when a node field is protected from instance synchronization.
 */
export function hasInstanceOverride(graph: SceneGraph, nodeId: string, field: string): boolean {
  const instance = findInstanceAncestor(graph, nodeId)
  if (!instance) return false
  return hasNodeInstanceOverride(instance.instanceOverrides, instance.id, nodeId, field)
}

/**
 * The layer of the component an instance layer copies, which its overrides are measured
 * against: the instance's component for the instance itself.
 */
function copiedLayer(graph: SceneGraph, instance: SceneNode, node: SceneNode) {
  const id =
    node.id === instance.id
      ? instance.componentId
      : copiedComponentLayerId(instance.instanceOverrides, instance.id, node)
  return id ? graph.nodes.get(id) : undefined
}

/**
 * The override fields an edit of these fields records. A mode edit claims only the collections
 * whose mode now differs from the component layer's, so the component's other modes still
 * reach the layer; with no layer to compare, it claims every mode.
 */
function overrideFieldsOf(
  graph: SceneGraph,
  instance: SceneNode,
  nodeId: string,
  fields: string[]
): string[] {
  if (!fields.includes('variableModes')) return fields
  const node = graph.nodes.get(nodeId)
  const source = node && copiedLayer(graph, instance, node)
  if (!node || !source) return fields
  return [
    ...fields.filter((field) => field !== 'variableModes'),
    ...differingVariableModeCollections(node, source).map(variableModeOverrideField)
  ]
}

/**
 * Records that an instance assigned one of its component properties, as an edit of the instance
 * above it: the assignment is made through the outer instance, so a text override of the same
 * level does not outrank it. A top-level instance has no outer instance to record it on.
 */
export function recordAssignmentOverride(
  graph: SceneGraph,
  instanceId: string,
  propertyId: string,
  value: string
): void {
  const parentId = graph.nodes.get(instanceId)?.parentId
  const outer = parentId ? findInstanceAncestor(graph, parentId) : undefined
  if (!outer) return
  setInstanceOverride(
    outer.instanceOverrides,
    outer.id,
    instanceId,
    assignmentOverrideField(propertyId),
    value
  )
  graph.updateNode(outer.id, { instanceOverrides: outer.instanceOverrides })
}

export function recordInstanceOverride(
  graph: SceneGraph,
  nodeId: string,
  fields: Iterable<string>
): void {
  const instance = findInstanceAncestor(graph, nodeId)
  if (!instance) return

  const relevant = overrideFieldsOf(
    graph,
    instance,
    nodeId,
    [...fields].filter(
      (field) =>
        (INSTANCE_OVERRIDE_FIELDS as readonly string[]).includes(field) ||
        overriddenAssignmentId(field) !== null
    )
  )

  if (relevant.length === 0) return

  for (const field of relevant)
    setInstanceOverride(instance.instanceOverrides, instance.id, nodeId, field)
  graph.updateNode(instance.id, { instanceOverrides: instance.instanceOverrides })
}

/** Every layer at or below `rootId`. */
function subtreeIds(graph: SceneGraph, rootId: string): string[] {
  const ids: string[] = []
  const visit = (id: string) => {
    ids.push(id)
    for (const childId of graph.nodes.get(id)?.childIds ?? []) visit(childId)
  }
  visit(rootId)
  return ids
}

/** Forget what the instances above `nodeId` recorded for it and the layers inside it. */
function forgetOverridesOf(graph: SceneGraph, nodeId: string): void {
  const ids = subtreeIds(graph, nodeId)
  const parentId = graph.nodes.get(nodeId)?.parentId
  if (!parentId) return
  graph.closest(parentId, (ancestor) => {
    if (ancestor.type !== 'INSTANCE') return false
    const { descendants } = ancestor.instanceOverrides
    if (ids.some((id) => descendants.delete(id)))
      graph.updateNode(ancestor.id, { instanceOverrides: ancestor.instanceOverrides })
    return false
  })
}

/** Whether a layer can be replaced in its instance: it sits in the part the component owns. */
export function canReplaceInstanceLayer(graph: SceneGraph, nodeId: string): boolean {
  const node = graph.nodes.get(nodeId)
  const owner = node && owningInstance(graph, node)
  if (!node?.parentId || !owner) return false
  // Slot content is the instance's own already, and a generated frame's layers are fixed.
  const scope = slotScope(graph, node.parentId)
  if (scope.kind !== 'locked' || scope.owner.type !== 'INSTANCE') return false
  return (
    replacedLayerIn(owner, node.id) !== undefined ||
    copiedComponentLayerId(owner.instanceOverrides, owner.id, node) !== undefined
  )
}

/**
 * Put `replacementId` in place of `targetId`, a layer an instance copies from its component, as
 * an override of the nearest instance above it, as pen.dev replaces a layer inside an instance.
 * The replacement takes the target's place among its siblings and its position, the target
 * goes, and syncs keep the replacement in place of the component layer the target copied. A
 * replaced layer can be replaced again. Returns false and changes nothing when the target is no
 * such layer, or the replacement cannot go there.
 */
export function replaceInstanceLayer(
  graph: SceneGraph,
  targetId: string,
  replacementId: string
): boolean {
  const target = graph.nodes.get(targetId)
  const replacement = graph.nodes.get(replacementId)
  const parentId = target?.parentId
  if (!target || !replacement || !parentId || targetId === replacementId) return false
  const owner = owningInstance(graph, target)
  if (!owner || graph.isDescendant(parentId, replacementId)) return false
  if (createsComponentCycle(graph, replacementId, parentId)) return false
  const layerId =
    replacedLayerIn(owner, target.id) ??
    copiedComponentLayerId(owner.instanceOverrides, owner.id, target)
  if (!layerId) return false

  // The replacement copies no layer of the component, so its own layers lose such links; an
  // instance among them keeps its own component and layers.
  const unlink = (id: string) => {
    const node = graph.nodes.get(id)
    if (!node) return
    if (node.type !== 'INSTANCE' && node.componentId) graph.updateNode(id, { componentId: null })
    if (node.type !== 'INSTANCE') node.childIds.forEach(unlink)
  }
  unlink(replacementId)

  const index = graph.nodes.get(parentId)?.childIds.indexOf(target.id) ?? -1
  forgetOverridesOf(graph, target.id)
  forgetOverridesOf(graph, replacementId)
  graph.insertChildAt(replacementId, parentId, index < 0 ? Number.MAX_SAFE_INTEGER : index)
  graph.updateNode(replacementId, {
    x: target.x,
    y: target.y,
    layoutPositioning: target.layoutPositioning,
    horizontalConstraint: target.horizontalConstraint,
    verticalConstraint: target.verticalConstraint
  })
  graph.deleteNode(target.id)
  setInstanceOverride(
    owner.instanceOverrides,
    owner.id,
    replacementId,
    REPLACED_LAYER_OVERRIDE,
    layerId
  )
  graph.updateNode(owner.id, { instanceOverrides: owner.instanceOverrides })
  return true
}

/**
 * Take a replaced layer out and bring back the component layer it stood in for, synced from the
 * outermost instance as a reset syncs. Returns false when the layer is not a replaced one.
 */
export function restoreReplacedLayer(graph: SceneGraph, nodeId: string): boolean {
  const node = graph.nodes.get(nodeId)
  const owner = node && owningInstance(graph, node)
  if (!node || !owner || replacedLayerIn(owner, nodeId) === undefined) return false
  let outermost = owner
  for (let above = owningInstance(graph, owner); above; above = owningInstance(graph, above))
    outermost = above
  forgetOverridesOf(graph, nodeId)
  graph.deleteNode(nodeId)
  syncInstance(graph, outermost.id)
  // An enclosing sync stops at a swapped instance, which brings its layers back itself.
  const above = owningInstance(graph, owner)
  if (above && getInstanceOverride(above.instanceOverrides, above.id, owner.id, 'componentId'))
    syncInstance(graph, owner.id)
  return true
}
