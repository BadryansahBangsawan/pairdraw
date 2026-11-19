export type InstanceOverrideField = string

export interface InstanceOverrideState {
  self: Map<InstanceOverrideField, unknown>
  descendants: Map<string, Map<InstanceOverrideField, unknown>>
}

const BINDING_OVERRIDE_PREFIX = 'boundVariables/'

/**
 * The override field that claims a layer's binding of `field`, which keeps that binding, or its
 * absence, through a sync. `boundVariables` alone claims every binding of the layer.
 */
export function bindingOverrideField(field: string): InstanceOverrideField {
  return `${BINDING_OVERRIDE_PREFIX}${field}`
}

/** The binding field an override field claims, or null for an override of anything else. */
export function overriddenBindingField(field: InstanceOverrideField): string | null {
  return field.startsWith(BINDING_OVERRIDE_PREFIX)
    ? field.slice(BINDING_OVERRIDE_PREFIX.length)
    : null
}

const VARIABLE_MODE_OVERRIDE_PREFIX = 'variableModes/'

/**
 * The override field that keeps a layer's mode for one collection through a sync, so the
 * component's modes for other collections still reach it. `variableModes` alone keeps them all.
 */
export function variableModeOverrideField(collectionId: string): InstanceOverrideField {
  return `${VARIABLE_MODE_OVERRIDE_PREFIX}${collectionId}`
}

/** The collection a mode override field claims, or null for an override of anything else. */
export function overriddenVariableModeCollection(field: InstanceOverrideField): string | null {
  return field.startsWith(VARIABLE_MODE_OVERRIDE_PREFIX)
    ? field.slice(VARIABLE_MODE_OVERRIDE_PREFIX.length)
    : null
}

const ASSIGNMENT_OVERRIDE_PREFIX = 'componentPropertyAssignments/'

/**
 * The override field that claims a nested instance's assignment of `propertyId`, which keeps
 * that assignment through a sync of the instance that makes it.
 */
export function assignmentOverrideField(propertyId: string): InstanceOverrideField {
  return `${ASSIGNMENT_OVERRIDE_PREFIX}${propertyId}`
}

/** The property an assignment override field claims, or null for an override of anything else. */
export function overriddenAssignmentId(field: InstanceOverrideField): string | null {
  return field.startsWith(ASSIGNMENT_OVERRIDE_PREFIX)
    ? field.slice(ASSIGNMENT_OVERRIDE_PREFIX.length)
    : null
}

/**
 * The override field that marks a layer of an instance as one put in place of a component's
 * layer, recorded by the nearest instance above it. Its value is the layer it replaces, which
 * sync matches it to instead of copying that layer in again.
 */
export const REPLACED_LAYER_OVERRIDE = 'replacedLayer'

/** Override fields whose value names another layer of the document. */
export function isLayerReferenceOverride(field: InstanceOverrideField): boolean {
  return (
    field === 'componentId' || field === 'sourceComponentId' || field === REPLACED_LAYER_OVERRIDE
  )
}

export function createInstanceOverrideState(): InstanceOverrideState {
  return { self: new Map(), descendants: new Map() }
}

export interface SerializedOverrideValue {
  defined: boolean
  value?: unknown
}

export interface SerializedInstanceOverrideState {
  self: Array<[InstanceOverrideField, SerializedOverrideValue]>
  descendants: Array<[string, Array<[InstanceOverrideField, SerializedOverrideValue]>]>
}

function serializeOverrideValue(value: unknown): SerializedOverrideValue {
  return value === undefined ? { defined: false } : { defined: true, value }
}

function deserializeOverrideValue(value: unknown): { valid: boolean; value: unknown } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, value: undefined }
  }
  if (!('defined' in value) || typeof value.defined !== 'boolean') {
    return { valid: false, value: undefined }
  }
  if (value.defined) {
    return 'value' in value
      ? { valid: true, value: value['value'] }
      : { valid: false, value: undefined }
  }
  return { valid: true, value: undefined }
}

function deserializeEntries(value: unknown): Map<InstanceOverrideField, unknown> {
  const result = new Map<InstanceOverrideField, unknown>()
  if (!Array.isArray(value)) return result
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') continue
    const decoded = deserializeOverrideValue(entry[1])
    if (decoded.valid) result.set(entry[0], decoded.value)
  }
  return result
}

export function serializeInstanceOverrideState(
  state: InstanceOverrideState
): SerializedInstanceOverrideState {
  return {
    self: [...state.self].map(([field, value]) => [field, serializeOverrideValue(value)]),
    descendants: [...state.descendants].map(([nodeId, fields]) => [
      nodeId,
      [...fields].map(([field, value]) => [field, serializeOverrideValue(value)])
    ])
  }
}

export function deserializeInstanceOverrideState(state: unknown): InstanceOverrideState {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return createInstanceOverrideState()
  }
  const self =
    'self' in state ? deserializeEntries(state.self) : new Map<InstanceOverrideField, unknown>()
  const descendants = new Map<string, Map<InstanceOverrideField, unknown>>()
  if ('descendants' in state && Array.isArray(state.descendants)) {
    for (const entry of state.descendants) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') continue
      descendants.set(entry[0], deserializeEntries(entry[1]))
    }
  }
  return { self, descendants }
}

export function cloneInstanceOverrideState(state: InstanceOverrideState): InstanceOverrideState {
  return {
    self: new Map([...state.self].map(([field, value]) => [field, structuredClone(value)])),
    descendants: new Map(
      [...state.descendants].map(([id, fields]) => [
        id,
        new Map([...fields].map(([field, value]) => [field, structuredClone(value)]))
      ])
    )
  }
}

export interface InstanceOverrideReferenceMapper {
  node: (id: string) => string
  variable: (id: string) => string
  collection?: (id: string) => string | undefined
  property?: (id: string) => string | undefined
}

/** Remap runtime identities only; ordinary strings and source-format payloads stay opaque. */
export function remapInstanceOverrideState(
  state: InstanceOverrideState,
  references: InstanceOverrideReferenceMapper
): InstanceOverrideState {
  const remapValue = (field: string, value: unknown): unknown => {
    if (typeof value !== 'string') return structuredClone(value)
    if (isLayerReferenceOverride(field)) return references.node(value)
    if (overriddenBindingField(field) !== null) return references.variable(value)
    return value
  }
  const remapField = (field: string): string | undefined => {
    const property = overriddenAssignmentId(field)
    if (property !== null && references.property) {
      const mapped = references.property(property)
      return mapped === undefined ? undefined : assignmentOverrideField(mapped)
    }
    const collection = overriddenVariableModeCollection(field)
    if (collection === null || !references.collection) return field
    const mapped = references.collection(collection)
    return mapped === undefined ? undefined : variableModeOverrideField(mapped)
  }
  const fields = (entries: ReadonlyMap<string, unknown>) =>
    new Map(
      [...entries].flatMap(([field, value]) => {
        const mapped = remapField(field)
        return mapped === undefined ? [] : [[mapped, remapValue(field, value)] as const]
      })
    )
  const descendants = new Map<string, Map<string, unknown>>()
  for (const [id, entries] of state.descendants) {
    const mapped = references.node(id)
    if (descendants.has(mapped)) throw new Error(`Duplicate remapped override target ${mapped}`)
    descendants.set(mapped, fields(entries))
  }
  return { self: fields(state.self), descendants }
}

export function getInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField
): unknown {
  return nodeId === instanceId ? state.self.get(field) : state.descendants.get(nodeId)?.get(field)
}

/**
 * The component layer a layer of an instance copies: the one its instance recorded for it, as
 * a swapped nested instance keeps, or else the one it was cloned from.
 */
export function copiedComponentLayerId(
  state: InstanceOverrideState,
  instanceId: string,
  node: { id: string; componentId: string | null }
): string | undefined {
  const recorded = getInstanceOverride(state, instanceId, node.id, 'sourceComponentId')
  return typeof recorded === 'string' ? recorded : (node.componentId ?? undefined)
}

export function hasInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField
): boolean {
  const fields = nodeId === instanceId ? state.self : state.descendants.get(nodeId)
  return fields?.has(field) ?? false
}

export function setInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField,
  value: unknown = true
): void {
  if (nodeId === instanceId) {
    state.self.set(field, value)
    return
  }
  const fields = state.descendants.get(nodeId) ?? new Map<string, unknown>()
  fields.set(field, value)
  state.descendants.set(nodeId, fields)
}

export function deleteInstanceOverride(
  state: InstanceOverrideState,
  instanceId: string,
  nodeId: string,
  field: InstanceOverrideField
): boolean {
  const fields = nodeId === instanceId ? state.self : state.descendants.get(nodeId)
  if (!fields?.delete(field)) return false
  if (nodeId !== instanceId && fields.size === 0) state.descendants.delete(nodeId)
  return true
}

export function clearInstanceOverrides(state: InstanceOverrideState): void {
  state.self.clear()
  state.descendants.clear()
}

export function forEachInstanceOverride(
  state: InstanceOverrideState,
  callback: (nodeId: string, field: InstanceOverrideField, value: unknown) => void
): void {
  for (const [field, value] of state.self) callback('', field, value)
  for (const [nodeId, fields] of state.descendants) {
    for (const [field, value] of fields) callback(nodeId, field, value)
  }
}
