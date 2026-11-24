import { compact, partition, sortBy, uniq } from 'es-toolkit/array'
import { omit, omitBy } from 'es-toolkit/object'

import { BLACK } from '../constants'
import type { SceneGraph } from '../graph'
import { findInstanceAncestor } from '../instances'
import {
  bindingOverrideField,
  setInstanceOverride,
  variableModeOverrideField
} from '../instances/overrides'
import { siblingOrderKeys } from '../order-keys'
import { isShaderSourcePaint, shaderOfPaint, withShaderPaints } from '../shaders/model'
import type {
  SceneNode,
  Variable,
  VariableCollection,
  VariableCollectionMode,
  VariableType,
  VariableValue
} from '../types'
import {
  isNumericVariableBindingField,
  variableBindingOwner,
  assignVariableBindingUnits
} from './bindings'
import {
  BOOLEAN_BINDING_FIELDS,
  ICON_BINDING_FIELDS,
  NUMERIC_FIELDS,
  paintBindingTarget,
  STRING_BINDING_FIELDS,
  TEXT_CONTENT_VARIABLE_TYPES,
  uniformBindingTarget,
  VISIBILITY_VARIABLE_TYPES,
  type PaintBindingList
} from './fields'
import { applyBoundPaintColor } from './paints'
import { pinnedRunBindingScales } from './units'

export * from './resolution'
export * from './resolver'

/**
 * Variables a list shows: every one but those deleted, on their own or with their collection,
 * which only their bindings still reach.
 */
export function liveVariables(graph: SceneGraph): Variable[] {
  return [...graph.variables.values()].filter(
    (variable) =>
      !variable.deleted && !graph.variableCollections.get(variable.collectionId)?.deleted
  )
}

/** Collections a list shows: every one but those deleted. */
export function liveCollections(graph: SceneGraph): VariableCollection[] {
  return [...graph.variableCollections.values()].filter((collection) => !collection.deleted)
}

/**
 * A collection's deleted variables, which its `variableIds` leave out. A deleted collection's
 * variables are all deleted.
 */
export function deletedVariablesOf(graph: SceneGraph, collectionId: string): Variable[] {
  return [...graph.variables.values()].filter(
    (variable) => variable.collectionId === collectionId && variable.deleted
  )
}

/**
 * Gives the runs that bind `fields` the scale they resolve with as their own, before the layer's
 * scale for those fields changes or goes, and the change to announce.
 */
function pinRunBindingScales(
  node: SceneNode,
  fields: readonly string[]
): Pick<Partial<SceneNode>, 'styleRuns'> {
  const styleRuns = pinnedRunBindingScales(node, fields)
  if (!styleRuns) return {}
  node.styleRuns = styleRuns
  return { styleRuns }
}

export function addVariable(graph: SceneGraph, variable: Variable): void {
  graph.variables.set(variable.id, variable)
  const collection = graph.variableCollections.get(variable.collectionId)
  if (!collection) return
  // A collection lists its live variables, so one replaced by its deleted record leaves the list.
  if (collection.variableIds.includes(variable.id) === !variable.deleted) return
  collection.variableIds = variable.deleted
    ? collection.variableIds.filter((id) => id !== variable.id)
    : [...collection.variableIds, variable.id]
}

export function removeVariable(graph: SceneGraph, id: string): void {
  const variable = graph.variables.get(id)
  if (!variable) return
  graph.variables.delete(id)
  const collection = graph.variableCollections.get(variable.collectionId)
  if (collection) {
    collection.variableIds = collection.variableIds.filter((vid) => vid !== id)
  }
  for (const node of graph.nodes.values()) {
    const hadBinding = Object.values(node.boundVariables).includes(id)
    if (!hadBinding) continue
    graph.willChangeNode(node)
    node.boundVariables = omitBy(node.boundVariables, (varId) => varId === id) as Record<
      string,
      string
    >
    const pruned = Object.keys(node.variableBindingScales).filter(
      (field) => !(field in node.boundVariables)
    )
    const runs = pinRunBindingScales(node, pruned)
    node.variableBindingScales = omit(node.variableBindingScales, pruned)
    graph.emitter.emit('node:updated', node.id, {
      boundVariables: { ...node.boundVariables },
      variableBindingScales: { ...node.variableBindingScales },
      ...runs
    })
    markBoundVariablesOverrideOnInstance(graph, node.id)
  }
}

export function addCollection(graph: SceneGraph, collection: VariableCollection): void {
  graph.variableCollections.set(collection.id, collection)
  if (!graph.activeMode.has(collection.id)) {
    graph.activeMode.set(collection.id, collection.defaultModeId)
  }
}

function defaultVariableValue(type: VariableType, value?: VariableValue): VariableValue {
  if (value !== undefined) return value
  if (type === 'COLOR') return { ...BLACK }
  if (type === 'FLOAT') return 0
  if (type === 'BOOLEAN') return false
  return ''
}

export function createVariable(
  graph: SceneGraph,
  generateId: () => string,
  name: string,
  type: VariableType,
  collectionId: string,
  value?: VariableValue
): Variable {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) throw new Error(`Collection "${collectionId}" not found`)
  const id = generateId()
  const defaultValue = defaultVariableValue(type, value)
  const valuesByMode: Record<string, VariableValue> = {}
  for (const mode of collection.modes) {
    valuesByMode[mode.modeId] = structuredClone(defaultValue)
  }
  const variable: Variable = {
    id,
    name,
    type,
    collectionId,
    valuesByMode,
    description: '',
    hiddenFromPublishing: false
  }
  addVariable(graph, variable)
  return variable
}

export function createCollection(
  graph: SceneGraph,
  generateId: () => string,
  name: string
): VariableCollection {
  const id = generateId()
  const modeId = generateId()
  const collection: VariableCollection = {
    id,
    name,
    modes: [{ modeId, name: 'Mode 1' }],
    defaultModeId: modeId,
    variableIds: []
  }
  addCollection(graph, collection)
  return collection
}

export function removeCollection(graph: SceneGraph, id: string): void {
  const collection = graph.variableCollections.get(id)
  if (collection) {
    for (const varId of Array.from(collection.variableIds)) {
      removeVariable(graph, varId)
    }
    for (const variable of deletedVariablesOf(graph, id)) removeVariable(graph, variable.id)
  }
  graph.variableCollections.delete(id)
  graph.activeMode.delete(id)
  // A layer that chose one of its modes has nothing left to choose from.
  for (const node of graph.nodes.values()) {
    if (!(id in node.variableModes)) continue
    const variableModes = omit(node.variableModes, [id])
    graph.willChangeNode(node)
    node.variableModes = variableModes
    graph.emitter.emit('node:updated', node.id, { variableModes })
  }
}

export function setActiveMode(graph: SceneGraph, collectionId: string, modeId: string): void {
  graph.activeMode.set(collectionId, modeId)
}

export function addMode(
  graph: SceneGraph,
  collectionId: string,
  modeId: string,
  name: string,
  sourceMode?: string
): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return
  collection.modes.push({ modeId, name })
  const sourceModeId = sourceMode ?? collection.defaultModeId
  for (const varId of collection.variableIds) {
    const variable = graph.variables.get(varId)
    if (!variable) continue
    variable.valuesByMode[modeId] = structuredClone(
      variable.valuesByMode[sourceModeId] ?? Object.values(variable.valuesByMode)[0]
    )
  }
}

/** Add a mode with a new ID from `generateId`; undo and redo replay it with `addMode`. */
export function createMode(
  graph: SceneGraph,
  generateId: () => string,
  collectionId: string,
  name: string,
  sourceMode?: string
): string | undefined {
  if (!graph.variableCollections.has(collectionId)) return undefined
  const modeId = generateId()
  addMode(graph, collectionId, modeId, name, sourceMode)
  return modeId
}

export function removeMode(graph: SceneGraph, collectionId: string, modeId: string): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection || collection.modes.length <= 1) return
  collection.modes = collection.modes.filter((m) => m.modeId !== modeId)
  if (collection.defaultModeId === modeId) {
    // The next default is the next listed mode, as Figma picks it, not the next saved entry.
    collection.defaultModeId = modesInListedOrder(collection)[0].modeId
  }
  for (const varId of collection.variableIds) {
    const variable = graph.variables.get(varId)
    if (variable) variable.valuesByMode = omit(variable.valuesByMode, [modeId])
  }
  // A layer that chose the mode goes back to the collection's default, and an instance keeps no
  // override naming a mode that is gone, which would otherwise come back on a later sync.
  const overrideField = variableModeOverrideField(collectionId)
  for (const node of graph.nodes.values()) {
    if (node.variableModes[collectionId] !== modeId) continue
    const variableModes = omit(node.variableModes, [collectionId])
    graph.willChangeNode(node)
    node.variableModes = variableModes
    node.instanceOverrides.self.delete(overrideField)
    for (const overrides of node.instanceOverrides.descendants.values())
      overrides.delete(overrideField)
    graph.emitter.emit('node:updated', node.id, { variableModes })
  }
  if (graph.activeMode.get(collectionId) === modeId) {
    graph.activeMode.set(collectionId, collection.defaultModeId)
  }
}

export function renameMode(
  graph: SceneGraph,
  collectionId: string,
  modeId: string,
  name: string
): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return
  const mode = collection.modes.find((m) => m.modeId === modeId)
  if (mode) mode.name = name
}

export function setDefaultMode(graph: SceneGraph, collectionId: string, modeId: string): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return
  if (!collection.modes.some((m) => m.modeId === modeId)) return
  collection.defaultModeId = modeId
  if (collection.modes.every((mode) => !mode.sortPosition)) {
    // No sort positions carry an order of their own: the array is the order, so the new
    // default moves first in it, as a collection created here has always done.
    collection.modes = modesDefaultFirst(collection)
    return
  }
  // The saved array order stays the file's own; the new default sorts first by its sort
  // position, so the listed order shows it first and a re-import reads it as the default.
  const listed = modesDefaultFirst(collection)
  const positions = siblingOrderKeys(listed.map((mode) => mode.sortPosition))
  const byId = new Map(listed.map((mode, index) => [mode.modeId, positions[index]]))
  collection.modes = collection.modes.map((mode) => ({
    ...mode,
    sortPosition: byId.get(mode.modeId) ?? mode.sortPosition
  }))
}

/** Figma has no default-mode field: the first listed mode is the default. */
export function modesDefaultFirst(collection: VariableCollection): VariableCollectionMode[] {
  const [defaults, rest] = partition(
    modesInListedOrder(collection),
    (m) => m.modeId === collection.defaultModeId
  )
  return [...defaults, ...rest]
}

/**
 * The modes as Figma lists them: by `sortPosition`, modes without one following in saved order.
 * The collection's own array keeps the file's saved order, which an export writes back as it was.
 */
export function modesInListedOrder(collection: VariableCollection): VariableCollectionMode[] {
  return sortBy(collection.modes, [(mode) => !mode.sortPosition, (mode) => mode.sortPosition ?? ''])
}

export function getVariablesForCollection(graph: SceneGraph, collectionId: string): Variable[] {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return []
  return collection.variableIds
    .map((id) => graph.variables.get(id))
    .filter((v): v is Variable => v !== undefined)
}

export function getVariablesByType(graph: SceneGraph, type: VariableType): Variable[] {
  return liveVariables(graph).filter((v) => v.type === type)
}

const PAINT_BINDING_LISTS = ['fills', 'strokes'] as const satisfies readonly PaintBindingList[]

/**
 * Every field a binding takes, from the same sets `checkBindingFieldType` reads, so a refusal for
 * an unknown one names what the caller can send instead of leaving them to guess.
 */
const ACCEPTED_BINDING_FIELDS: readonly string[] = [
  ...NUMERIC_FIELDS,
  ...STRING_BINDING_FIELDS,
  ...BOOLEAN_BINDING_FIELDS,
  ...ICON_BINDING_FIELDS,
  ...PAINT_BINDING_LISTS.flatMap((list) => [`${list}/<n>/color`, `${list}/<n>/uniforms/<name>`])
]

/**
 * Throws when a variable of `type` cannot bind to `field`, or for a field no binding takes. A
 * paint target is checked by its caller, which also validates its index.
 */
function checkBindingFieldType(field: string, type: VariableType): void {
  if (isNumericVariableBindingField(field) && type !== 'FLOAT') {
    throw new Error(`Cannot bind ${type} variable to scalar field "${field}"`)
  }

  const textTypes: readonly VariableType[] =
    field === 'text' ? TEXT_CONTENT_VARIABLE_TYPES : ['STRING']
  if (STRING_BINDING_FIELDS.has(field) && !textTypes.includes(type)) {
    throw new Error(`Cannot bind ${type} variable to string field "${field}"`)
  }

  if (
    BOOLEAN_BINDING_FIELDS.has(field) &&
    !VISIBILITY_VARIABLE_TYPES.some((kind) => kind === type)
  ) {
    throw new Error(`Cannot bind ${type} variable to boolean field "${field}"`)
  }

  if (ICON_BINDING_FIELDS.has(field) && type !== 'STRING') {
    throw new Error(`Cannot bind ${type} variable to icon field "${field}"`)
  }

  // A shader uniform takes a number, a colour, or a boolean; its shader declares which.
  const uniform = uniformBindingTarget(field)
  if (uniform && type !== 'FLOAT' && type !== 'COLOR' && type !== 'BOOLEAN') {
    throw new Error(`Cannot bind ${type} variable to shader input "${field}"`)
  }

  const isKnownField =
    isNumericVariableBindingField(field) ||
    STRING_BINDING_FIELDS.has(field) ||
    BOOLEAN_BINDING_FIELDS.has(field) ||
    ICON_BINDING_FIELDS.has(field) ||
    paintBindingTarget(field) !== null ||
    uniform !== null

  if (!isKnownField) {
    throw new Error(
      `Unknown binding field "${field}". Accepted: ${ACCEPTED_BINDING_FIELDS.join(', ')}`
    )
  }
}
export function bindVariable(
  graph: SceneGraph,
  nodeId: string,
  field: string,
  variableId: string
): void {
  const node = graph.nodes.get(nodeId)
  if (!node) return

  // Validate variable exists
  const variable = graph.variables.get(variableId)
  if (!variable) {
    throw new Error(`Variable "${variableId}" not found`)
  }

  const paint = paintBindingTarget(field)
  if (paint) {
    if (variable.type !== 'COLOR') {
      throw new Error(`Cannot bind ${variable.type} variable to color field "${field}"`)
    }
    // Validate index is within current array bounds
    const currentLength = node[paint.list].length
    if (paint.index >= currentLength) {
      throw new Error(
        `Index ${paint.index} out of range for ${paint.list} (length ${currentLength})`
      )
    }
    // Auto-remove top-level dead binding (e.g. 'fills') when setting indexed binding
    if (paint.list in node.boundVariables) {
      graph.willChangeNode(node)
      node.boundVariables = omit(node.boundVariables, [paint.list])
    }
  }

  checkBindingFieldType(field, variable.type)

  // A shader input belongs to one paint, so its index must exist on the layer.
  const uniform = uniformBindingTarget(field)
  if (uniform && uniform.index >= node[uniform.list].length) {
    throw new Error(
      `Index ${uniform.index} out of range for ${uniform.list} (length ${node[uniform.list].length})`
    )
  }
  if (uniform) {
    // The binding lives with the shader entry, next to the value it resolves, so any renderer
    // that draws the paint resolves it the same way.
    const paints = node[uniform.list]
    const paint = paints.at(uniform.index)
    const shader = paint ? shaderOfPaint(node, paint) : null
    if (paint && shader && isShaderSourcePaint(shader)) {
      node.pluginData = withShaderPaints(node, paints, [
        {
          ...shader,
          uniformBindings: {
            ...shader.uniformBindings,
            [uniform.name]: variableId
          }
        }
      ])
    }
    graph.willChangeNode(node)
    graph.emitter.emit('node:updated', nodeId, {
      pluginData: node.pluginData,
      boundVariables: { ...node.boundVariables },
      variableBindingScales: { ...node.variableBindingScales }
    })
    return
  }
  graph.willChangeNode(node)
  node.boundVariables = { ...node.boundVariables, [field]: variableId }
  const runs = pinRunBindingScales(node, [field])
  assignVariableBindingUnits(graph, node, field)
  markBoundVariablesOverrideOnInstance(graph, nodeId, field)
  graph.emitter.emit('node:updated', nodeId, {
    boundVariables: { ...node.boundVariables },
    variableBindingScales: { ...node.variableBindingScales },
    ...runs
  })
  // A paint takes its variable's color, alpha as opacity, when it binds, as Figma's does.
  if (paint) applyBoundPaintColor(graph, node, field)
}

export function unbindVariable(graph: SceneGraph, nodeId: string, field: string): void {
  const node = graph.nodes.get(nodeId)
  if (!node) return
  if (!(field in node.boundVariables)) return
  graph.willChangeNode(node)
  node.boundVariables = omit(node.boundVariables, [field])
  const runs = pinRunBindingScales(node, [field])
  node.variableBindingScales = omit(node.variableBindingScales, [field])
  markBoundVariablesOverrideOnInstance(graph, nodeId, field)
  graph.emitter.emit('node:updated', nodeId, {
    boundVariables: { ...node.boundVariables },
    variableBindingScales: { ...node.variableBindingScales },
    ...runs
  })
}

function markBoundVariablesOverrideOnInstance(
  graph: SceneGraph,
  nodeId: string,
  field?: string
): void {
  const node = graph.nodes.get(nodeId)
  if (!node) return

  const owner = variableBindingOwner(graph, node)
  if (owner.type !== 'INSTANCE') return
  const nearest = findInstanceAncestor(graph, nodeId)
  const instances = uniq(compact([nearest, owner])).filter((x) => x.id !== nodeId)
  for (const instance of instances) graph.willChangeNode(instance)
  if (nearest) setInstanceOverride(nearest.instanceOverrides, nearest.id, nodeId, 'boundVariables')
  setInstanceOverride(owner.instanceOverrides, owner.id, nodeId, 'boundVariables')
  // Each instance claims the binding it changed alone, so the layer's other bindings keep
  // following their components, as Figma claims only the paint or effect a script edits.
  if (field)
    for (const instance of instances)
      setInstanceOverride(
        instance.instanceOverrides,
        instance.id,
        nodeId,
        bindingOverrideField(field),
        node.boundVariables[field] ?? null
      )
  for (const instance of instances)
    graph.updateNode(instance.id, { instanceOverrides: instance.instanceOverrides })
}

export * from './bindings'
export * from './corners'
export * from './formula'
export * from './formula/schema'
export * from './paints'
export * from './schema'
export * from './text'
export * from './token'
export * from './units'
export * from './value'
