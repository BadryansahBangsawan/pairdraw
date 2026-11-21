import { omit, uniq } from 'es-toolkit'
import { isEqual } from 'es-toolkit/predicate'

import type {
  ComponentPropertyReferenceField,
  SceneGraph,
  SceneNode,
  Stroke
} from '@pairdraw/scene-graph'
import { findInstanceAncestor, isReplacedLayer } from '@pairdraw/scene-graph/instances'
import {
  overriddenAssignmentId,
  overriddenBindingField,
  overriddenVariableModeCollection,
  REPLACED_LAYER_OVERRIDE,
  type InstanceOverrideState
} from '@pairdraw/scene-graph/instances/overrides'

import type { NodeProxyInternals, ProxyThis } from './accessor-utils'
import { assertProxyEditable, graph, raw } from './accessor-utils'
import { flushPendingLayout } from './pending-layout'

/** One layer of an instance and the fields an edit changed on it, as Figma's `overrides`. */
export interface FigmaInstanceOverride {
  id: string
  overriddenFields: string[]
}

/**
 * The fields Figma desktop 126 lists for an override of each of ours. Unlisted fields are ones
 * Figma does not report: a layer's own size, size limits, clipping, the layout mode, a swap.
 * Figma spells the top stroke weight `stokeTopWeight`.
 */
const FIGMA_OVERRIDE_FIELDS: Readonly<Partial<Record<string, readonly string[]>>> = {
  // Figma keeps a size as one field, so a changed width or height lists both.
  width: ['height', 'width'],
  height: ['height', 'width'],
  name: ['name'],
  visible: ['visible'],
  locked: ['locked'],
  text: ['characters', 'styledTextSegments'],
  styleRuns: ['styledTextSegments'],
  textParagraphs: ['styledTextSegments'],
  listSpacing: ['styledTextSegments'],
  fontSize: ['fontSize'],
  fontFamily: ['fontName'],
  fontWeight: ['fontName'],
  italic: ['fontName'],
  fontStyle: ['fontName'],
  letterSpacing: ['letterSpacing'],
  lineHeight: ['lineHeight'],
  textCase: ['textCase'],
  textDecoration: ['textDecoration'],
  textDecorationStyle: ['textDecorationStyle'],
  textDecorationThickness: ['textDecorationThickness'],
  textUnderlineOffset: ['textDecorationOffset'],
  textDecorationFills: ['textDecorationColor'],
  textDecorationSkipInk: ['textDecorationSkipInk'],
  textAlignHorizontal: ['textAlignHorizontal'],
  textAlignVertical: ['textAlignVertical'],
  textAutoResize: ['textAutoResize'],
  textTruncation: ['textTruncation'],
  maxLines: ['maxLines'],
  leadingTrim: ['leadingTrim'],
  paragraphSpacing: ['paragraphSpacing'],
  paragraphIndent: ['paragraphIndent'],
  hangingList: ['hangingList'],
  fills: ['fills'],
  strokes: ['strokes'],
  effects: ['effects'],
  opacity: ['opacity'],
  blendMode: ['blendMode'],
  cornerRadius: [
    'bottomLeftRadius',
    'bottomRightRadius',
    'cornerRadius',
    'topLeftRadius',
    'topRightRadius'
  ],
  topLeftRadius: ['topLeftRadius'],
  topRightRadius: ['topRightRadius'],
  bottomRightRadius: ['bottomRightRadius'],
  bottomLeftRadius: ['bottomLeftRadius'],
  cornerSmoothing: ['cornerSmoothing'],
  strokeWeight: [
    'strokeBottomWeight',
    'strokeLeftWeight',
    'strokeRightWeight',
    'stokeTopWeight',
    'strokeWeight'
  ],
  borderTopWeight: ['stokeTopWeight'],
  borderRightWeight: ['strokeRightWeight'],
  borderBottomWeight: ['strokeBottomWeight'],
  borderLeftWeight: ['strokeLeftWeight'],
  strokeAlign: ['strokeAlign'],
  strokeCap: ['strokeCap'],
  strokeJoin: ['strokeJoin'],
  strokeMiterLimit: ['strokeMiterLimit'],
  dashPattern: ['dashPattern'],
  layoutWrap: ['layoutWrap'],
  primaryAxisAlign: ['primaryAxisAlignItems'],
  counterAxisAlign: ['counterAxisAlignItems'],
  primaryAxisSizing: ['primaryAxisSizingMode'],
  counterAxisSizing: ['counterAxisSizingMode'],
  itemSpacing: ['itemSpacing'],
  counterAxisSpacing: ['counterAxisSpacing'],
  paddingTop: ['paddingTop'],
  paddingRight: ['paddingRight'],
  paddingBottom: ['paddingBottom'],
  paddingLeft: ['paddingLeft'],
  gridColumnGap: ['gridColumnGap'],
  gridRowGap: ['gridRowGap'],
  itemReverseZIndex: ['itemReverseZIndex'],
  layoutGrids: ['layoutGrids'],
  layoutGrow: ['layoutGrow'],
  layoutAlignSelf: ['layoutAlign'],
  boundVariables: ['boundVariables'],
  variableModes: ['explicitVariableModes'],
  fillStyleId: ['fillStyleId'],
  strokeStyleId: ['strokeStyleId'],
  textStyleId: ['textStyleId'],
  effectStyleId: ['effectStyleId'],
  gridStyleId: ['gridStyleId']
}

/** Fields a component property sets on a layer, which Figma reports as the property's, not an override. */
const PROPERTY_FIELDS: Record<ComponentPropertyReferenceField, readonly string[]> = {
  TEXT: ['text', 'styleRuns', 'textParagraphs'],
  VISIBLE: ['visible'],
  INSTANCE_SWAP: ['componentId', 'name'],
  SLOT_CONTENT: []
}

function propertyFields(node: SceneNode): Set<string> {
  return new Set(node.componentPropertyReferences.flatMap(({ field }) => PROPERTY_FIELDS[field]))
}

/** Figma sorts the names as spelled right, so its misspelled top weight sorts as `strokeTop…`. */
const sortKey = (name: string) => (name === 'stokeTopWeight' ? 'strokeTopWeight' : name)

function figmaFields(fields: Iterable<string>, skipped: Set<string>): string[] {
  const names = new Set<string>()
  for (const field of fields) {
    if (skipped.has(field)) continue
    for (const name of FIGMA_OVERRIDE_FIELDS[field] ?? []) names.add(name)
  }
  return [...names].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
}

/**
 * The layer of the component a node copies, which its overrides are measured against. A nested
 * instance links to the component's instance it copies, until a swap points it at a component;
 * the enclosing instance then keeps the layer it copied.
 */
function componentLayer(
  graph: SceneGraph,
  node: SceneNode,
  owner: SceneNode | undefined
): SceneNode | undefined {
  const linked = node.componentId ? graph.getNode(node.componentId) : undefined
  if (node.type !== 'INSTANCE' || linked?.type === 'INSTANCE') {
    return linked ? resolveCopiedLayer(graph, linked) : linked
  }
  const source = owner?.instanceOverrides.descendants.get(node.id)?.get('sourceComponentId')
  if (typeof source === 'string') return graph.getNode(source)
  return componentLayerByName(graph, node, owner)
}

/**
 * A copy inside a nested instance links to the enclosing component's copy, which in turn links
 * to the nested component's layer. Follow that chain to the layer an edit belongs to.
 */
function resolveCopiedLayer(graph: SceneGraph, linked: SceneNode): SceneNode {
  let target = linked
  for (let depth = 0; depth < 32 && target.componentId; depth++) {
    const parent = target.parentId ? graph.getNode(target.parentId) : undefined
    if (parent?.type !== 'INSTANCE') break
    const next = graph.getNode(target.componentId)
    if (!next) break
    target = next
  }
  return target
}

/**
 * A copy made by cloning carries no link to its source, so match the path from its instance to
 * the instance's component by sibling position and name.
 */
function componentLayerByName(
  graph: SceneGraph,
  node: SceneNode,
  owner: SceneNode | undefined
): SceneNode | undefined {
  if (owner?.type !== 'INSTANCE' || !owner.componentId) return undefined
  const path: SceneNode[] = []
  let current: SceneNode | undefined = node
  while (current && current.id !== owner.id) {
    path.unshift(current)
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  if (!current) return undefined
  let source = graph.getNode(owner.componentId)
  // A nested instance copies the enclosing component's nested instance, so follow its link to
  // the component that instance actually shows.
  while (source?.type === 'INSTANCE' && source.componentId)
    source = graph.getNode(source.componentId)
  for (const step of path) {
    if (!source) return undefined
    source = matchingComponentChild(graph, source, step)
  }
  return source
}

/** The component child a copy at the same place shows, preferring its sibling position. */
function matchingComponentChild(
  graph: SceneGraph,
  source: SceneNode,
  step: SceneNode
): SceneNode | undefined {
  const siblings = graph.getChildren(source.id)
  const index = step.parentId ? graph.getNode(step.parentId)?.childIds.indexOf(step.id) : -1
  const atIndex = index !== undefined && index >= 0 ? siblings[index] : undefined
  if (atIndex?.type === step.type) return atIndex
  return (
    siblings.find((sibling) => sibling.type === step.type && sibling.name === step.name) ??
    siblings.find((sibling) => sibling.type === step.type)
  )
}

/** Figma keeps stroke weight and alignment on the layer, so a paint differs by its colour alone. */
const paints = (strokes: readonly Stroke[]) =>
  strokes.map((stroke) => omit(stroke, ['weight', 'align']))

function differs(node: SceneNode, source: SceneNode | undefined, field: string): boolean {
  if (!source) return true
  if (field === 'strokes') return !isEqual(paints(node.strokes), paints(source.strokes))
  return !isEqual(Reflect.get(node, field), Reflect.get(source, field))
}

/**
 * The fields recorded as edited on a node that still differ from its component layer: an edit
 * kept in the nearest instance above it, and one kept on the node itself if it is an instance.
 * Figma lists a field as overridden only while it differs.
 */
function editedFields(graph: SceneGraph, node: SceneNode, root: SceneNode): string[] {
  const owner =
    node.id === root.id || !node.parentId ? undefined : findInstanceAncestor(graph, node.parentId)
  const source =
    node.id === root.id ? graph.getNode(root.componentId ?? '') : componentLayer(graph, node, owner)
  const fields = [
    ...(node.type === 'INSTANCE' ? node.instanceOverrides.self.keys() : []),
    ...(owner?.instanceOverrides.descendants.get(node.id)?.keys() ?? [])
  ].map((field) =>
    // A mode set for one collection is an override of the layer's modes, as Figma lists it.
    overriddenVariableModeCollection(field) === null ? field : 'variableModes'
  )
  // The instance's own size counts once it differs, as a layer that grows it makes it.
  if (node.id === root.id) fields.push('width', 'height')
  return uniq(fields).filter((field) => differs(node, source, field))
}

/**
 * Figma's `overrides`: each layer of the instance, itself first and then in layer order, with
 * the fields edited on it, including those inside nested instances. Figma lists no layer's own
 * size but the instance's.
 */
export function instanceOverrides(graph: SceneGraph, root: SceneNode): FigmaInstanceOverride[] {
  const result: FigmaInstanceOverride[] = []
  const visit = (node: SceneNode) => {
    const skipped = propertyFields(node)
    if (node.id !== root.id) skipped.add('width').add('height')
    const overriddenFields = figmaFields(editedFields(graph, node, root), skipped)
    if (overriddenFields.length > 0) result.push({ id: node.id, overriddenFields })
    for (const child of graph.getChildren(node.id)) visit(child)
  }
  visit(root)
  return result
}

/** Clears an override state but what component properties set, which Figma keeps on reset. */
function withoutEdits(graph: SceneGraph, state: InstanceOverrideState): InstanceOverrideState {
  const keep = (nodeId: string, fields: Map<string, unknown>) => {
    const node = graph.getNode(nodeId)
    const driven = node ? propertyFields(node) : new Set<string>()
    return new Map([...fields].filter(([field]) => driven.has(field)))
  }
  const descendants = new Map(
    [...state.descendants]
      .map(([nodeId, fields]) => [nodeId, keep(nodeId, fields)] as const)
      .filter(([, fields]) => fields.size > 0)
  )
  return { self: new Map(), descendants }
}

/** Every instance at or below `root`, deepest first, as pushing each one's edits needs them. */
function instancesDeepestFirst(graph: SceneGraph, root: SceneNode): SceneNode[] {
  const result: SceneNode[] = []
  const visit = (node: SceneNode): void => {
    for (const child of graph.getChildren(node.id)) visit(child)
    if (node.type === 'INSTANCE') result.push(node)
  }
  visit(root)
  return result
}

/** The main component an instance's own edits belong to, if it can take them. */
function pushableMainComponent(
  graph: SceneGraph,
  instance: SceneNode,
  canEditMain: ((componentId: string) => boolean) | undefined
): SceneNode | null {
  let component = instance.componentId ? graph.getNode(instance.componentId) : undefined
  // A nested copy's link points at the enclosing component's nested instance, not at the
  // component that instance shows, so follow it to the main component the edits belong to.
  while (component?.type === 'INSTANCE' && component.componentId) {
    component = graph.getNode(component.componentId)
  }
  if (component?.type !== 'COMPONENT') return null
  if (canEditMain && !canEditMain(component.id)) return null
  return component
}

/**
 * Applies one recorded override field from an instance layer to the component layer it copies.
 * Returns whether the field was a text pushed into a component property's default.
 */
function pushOverrideField(
  graph: SceneGraph,
  target: SceneNode,
  source: SceneNode,
  field: string
): boolean {
  // A source link is bookkeeping for sync; a replaced layer is a structural edit, not a field.
  if (field === 'sourceComponentId' || field === REPLACED_LAYER_OVERRIDE) return false
  // Assigning a component property belongs to the instance, not to the main component.
  if (overriddenAssignmentId(field) !== null) return false
  const collection = overriddenVariableModeCollection(field)
  if (collection !== null) {
    const modes = Object.hasOwn(source.variableModes, collection)
      ? { ...target.variableModes, [collection]: source.variableModes[collection] }
      : omit(target.variableModes, [collection])
    graph.updateNode(target.id, { variableModes: modes })
    return false
  }
  const binding = overriddenBindingField(field)
  if (binding !== null) {
    const bindings = Object.hasOwn(source.boundVariables, binding)
      ? {
          ...target.boundVariables,
          [binding]: structuredClone(source.boundVariables[binding])
        }
      : omit(target.boundVariables, [binding])
    graph.updateNode(target.id, { boundVariables: bindings })
    return false
  }
  const value = Reflect.get(source, field)
  if (value === undefined) return false
  const defaulted =
    field === 'text' && typeof value === 'string'
      ? pushBoundTextDefault(graph, target, value)
      : false
  graph.updateNode(target.id, { [field]: structuredClone(value) })
  return defaulted
}

/** The override state after a push: property values stay, but a text pushed as a default goes. */
function clearedAfterPush(
  graph: SceneGraph,
  state: InstanceOverrideState,
  defaulted: Set<string>
): InstanceOverrideState {
  const cleared = withoutEdits(graph, state)
  const descendants = new Map(cleared.descendants)
  for (const nodeId of defaulted) {
    const fields = descendants.get(nodeId)
    if (!fields) continue
    fields.delete('text')
    if (fields.size === 0) descendants.delete(nodeId)
  }
  return { self: cleared.self, descendants }
}

/**
 * A text layer bound to a text property shows the property's default on the main component.
 * Pushing the edit moves that default with it, so the canvas and the property panel agree.
 * Returns whether the field was pushed as a default.
 */
function pushBoundTextDefault(graph: SceneGraph, target: SceneNode, text: string): boolean {
  const propertyId = target.componentPropertyReferences.find(
    (reference) => reference.field === 'TEXT'
  )?.propertyId
  if (!propertyId) return false
  const owner = graph.closest(
    target.parentId ?? target.id,
    (node) =>
      (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') &&
      node.componentPropertyDefinitions.some((definition) => definition.id === propertyId)
  )
  const definition = owner?.componentPropertyDefinitions.find((item) => item.id === propertyId)
  if (!owner || !definition) return false
  if (definition.defaultValue !== text)
    graph.updateNode(owner.id, {
      componentPropertyDefinitions: owner.componentPropertyDefinitions.map((item) =>
        item.id === propertyId ? { ...item, defaultValue: text } : item
      )
    })
  // Every other definition layer the property drives follows the new default, as editing the
  // default does. A nested instance's copies belong to their own component and are left to sync.
  const visit = (node: SceneNode): void => {
    for (const child of graph.getChildren(node.id)) {
      if (child.type === 'INSTANCE') continue
      if (
        child.type === 'TEXT' &&
        child.componentPropertyReferences.some(
          (reference) => reference.propertyId === propertyId && reference.field === 'TEXT'
        )
      )
        graph.updateNode(child.id, { text })
      visit(child)
    }
  }
  visit(owner)
  return true
}

/**
 * Whether pushing `root`'s changes can reach every main component they belong to. Pushing is
 * refused for a library component, whose main is read-only.
 */
export function canPushInstanceOverrides(
  graph: SceneGraph,
  root: SceneNode,
  canEditMain?: (componentId: string) => boolean
): boolean {
  if (root.type !== 'INSTANCE') return false
  let found = false
  for (const instance of instancesDeepestFirst(graph, root)) {
    if (
      instance.instanceOverrides.self.size === 0 &&
      instance.instanceOverrides.descendants.size === 0
    )
      continue
    if (!pushableMainComponent(graph, instance, canEditMain)) return false
    found = true
  }
  return found
}

/**
 * Figma's Push changes to main component: writes the edits of `root` and the instances inside
 * it to their own main components, then clears those edits so every instance follows. A
 * nested instance's edits go to its nested main; the outer main then picks them up by sync.
 * Returns false, changing nothing, when a main component is missing or read-only.
 */
export function pushInstanceOverrides(
  graph: SceneGraph,
  root: SceneNode,
  canEditMain?: (componentId: string) => boolean
): boolean {
  if (!canPushInstanceOverrides(graph, root, canEditMain)) return false
  const instances = instancesDeepestFirst(graph, root).filter(
    (instance) =>
      instance.instanceOverrides.self.size > 0 || instance.instanceOverrides.descendants.size > 0
  )
  const components: string[] = []
  const defaulted = new Set<string>()
  for (const instance of instances) {
    const main = pushableMainComponent(graph, instance, canEditMain)
    if (!main) return false
    if (!components.includes(main.id)) components.push(main.id)
    const state = instance.instanceOverrides
    for (const [field] of state.self) {
      pushOverrideField(graph, main, instance, field)
    }
    for (const [nodeId, fields] of state.descendants) {
      const node = graph.getNode(nodeId)
      if (!node) continue
      const owner = node.parentId ? findInstanceAncestor(graph, node.parentId) : undefined
      const target = componentLayer(graph, node, owner)
      if (!target) continue
      for (const [field] of fields) {
        if (pushOverrideField(graph, target, node, field)) defaulted.add(nodeId)
      }
    }
  }
  for (const instance of instances) {
    graph.updateNode(instance.id, {
      instanceOverrides: clearedAfterPush(graph, instance.instanceOverrides, defaulted)
    })
  }
  // Deepest main first, then every component holding an instance of one: an outer main syncs
  // the nested instance the inner main changed, and so on up to the page.
  graph.syncInstancesTogether(followingComponents(graph, components))
  return true
}

/** The pushed mains and every component whose instances show one of them, deepest first. */
function followingComponents(graph: SceneGraph, components: string[]): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  const visit = (id: string): void => {
    if (seen.has(id)) return
    seen.add(id)
    order.push(id)
    for (const instance of graph.getInstances(id)) {
      const holder = instance.parentId
        ? graph.closest(instance.parentId, (node) => node.type === 'COMPONENT')
        : undefined
      if (holder) visit(holder.id)
    }
  }
  for (const id of components) visit(id)
  return order
}

/**
 * Figma's `resetOverrides`: the instance and every instance inside it go back to their
 * components, keeping the values their component properties set.
 */
export function resetInstanceOverrides(graph: SceneGraph, root: SceneNode): void {
  // A layer put in place of a component's layer goes, and the sync brings that layer back.
  const replaced: string[] = []
  const collect = (node: SceneNode) => {
    for (const child of graph.getChildren(node.id)) {
      if (isReplacedLayer(graph, child)) replaced.push(child.id)
      else collect(child)
    }
  }
  collect(root)
  for (const id of replaced) graph.deleteNode(id)
  const visit = (node: SceneNode) => {
    if (node.type === 'INSTANCE')
      graph.updateNode(node.id, { instanceOverrides: withoutEdits(graph, node.instanceOverrides) })
    for (const child of graph.getChildren(node.id)) visit(child)
  }
  visit(root)
  // The outermost instance passes its component's content down to the ones inside it.
  let outermost = root
  for (
    let parent = root.parentId ? findInstanceAncestor(graph, root.parentId) : undefined;
    parent;
  ) {
    outermost = parent
    parent = parent.parentId ? findInstanceAncestor(graph, parent.parentId) : undefined
  }
  graph.syncInstance(outermost.id)
}

export function installInstanceOverrideAccessors(
  prototype: object,
  internals: NodeProxyInternals
): void {
  Object.defineProperties(prototype, {
    overrides: {
      get(this: ProxyThis): FigmaInstanceOverride[] | undefined {
        const node = raw(this, internals)
        if (node.type !== 'INSTANCE') return undefined
        // Figma lists the size its layout gives the instance.
        flushPendingLayout(graph(this, internals))
        return instanceOverrides(graph(this, internals), node)
      }
    },
    resetOverrides: {
      value(this: ProxyThis) {
        const node = raw(this, internals)
        if (node.type !== 'INSTANCE')
          throw new TypeError('resetOverrides() can only be called on instances')
        assertProxyEditable(this, internals)
        resetInstanceOverrides(graph(this, internals), node)
      }
    }
  })
}
