import { isEqual } from 'es-toolkit/predicate'

import type { VariableModeFallback } from '.'
import type { SceneGraph } from '../graph'
import { readIcon } from '../icons/model'
import { ICON_NAME } from '../icons/schema'
import { hasInstanceOverride } from '../instances/overrides'
import { pixelLength } from '../text/lengths'
import type { SceneNode, StyleRun, TextLength } from '../types'
import { NUMERIC_FIELDS, isNumericVariableBindingField } from './fields'
import { refreshBoundPaints } from './paints'
import { createVariableResolver, type VariableResolver } from './resolver'
import { subtreeNodes } from './subtree'
import { variableFontFamily, variableText, variableTruthy } from './text'
import { runBindingScale } from './units'
import { variableValueReferences } from './value'
export {
  ICON_BINDING_FIELDS,
  isNumericVariableBindingField,
  paintBindingTarget,
  TEXT_CONTENT_VARIABLE_TYPES,
  VISIBILITY_VARIABLE_TYPES,
  type PaintBindingList
} from './fields'

/** New declarations belong to the outermost occurrence, bounded by a component definition. */
export function variableBindingOwner(graph: SceneGraph, node: SceneNode): SceneNode {
  let owner = node
  let current: SceneNode | undefined = node
  while (current) {
    if (current.type === 'COMPONENT' || current.type === 'COMPONENT_SET') break
    if (current.type === 'INSTANCE') owner = current
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return owner
}

export function assignVariableBindingUnits(
  graph: SceneGraph,
  node: SceneNode,
  field: string
): void {
  if (!isNumericVariableBindingField(field)) return
  const owner = variableBindingOwner(graph, node)
  node.variableBindingScales = {
    ...node.variableBindingScales,
    [field]: owner.variableAssignmentScales[field] ?? 1
  }
}

/** Fields a bound number sets as a length in pixels, as Figma's do, whatever unit they held. */
const TEXT_LENGTH_FIELDS: ReadonlySet<string> = new Set(['lineHeight', 'letterSpacing'])

/** Whether the instance a layer sits in, or the instance itself, overrides one of its fields. */
function overriddenInInstance(graph: SceneGraph, nodeId: string, field: string): boolean {
  const instance = graph.closest(nodeId, (node) => node.type === 'INSTANCE')
  return !!instance && hasInstanceOverride(instance.instanceOverrides, instance.id, nodeId, field)
}

/** A bound number as the field stores it. */
export function boundNumberValue(field: string, value: number): number | TextLength {
  return TEXT_LENGTH_FIELDS.has(field) ? pixelLength(value) : value
}

/** One resolver per field lookup, unless a caller reconciling many nodes shares its own. */
function resolverFor(graph: SceneGraph, resolver?: VariableResolver): VariableResolver {
  return resolver ?? createVariableResolver(graph)
}

/**
 * The values a node's numeric bindings resolve to in its mode, in scene units, for the fields
 * whose stored value differs. A width or height an instance overrides keeps its own value.
 */
export function resolvedNumericBindings(
  graph: SceneGraph,
  node: SceneNode,
  fallback: VariableModeFallback = 'active',
  resolver?: VariableResolver
): Partial<SceneNode> {
  const updates: Partial<SceneNode> = {}
  const reader = resolverFor(graph, resolver).forNode(node.id, fallback)
  for (const [field, variableId] of Object.entries(node.boundVariables)) {
    if (!NUMERIC_FIELDS.has(field)) continue
    if ((field === 'width' || field === 'height') && overriddenInInstance(graph, node.id, field))
      continue
    const value = reader.number(variableId)
    if (value === undefined || !Number.isFinite(value)) continue
    const scale = node.variableBindingScales[field] ?? 1
    const effective = value * scale
    if (!Number.isFinite(effective)) continue
    const next = boundNumberValue(
      field,
      field === 'opacity' ? Math.max(0, Math.min(1, effective)) : effective
    )
    if (!isEqual(node[field as keyof SceneNode], next)) Object.assign(updates, { [field]: next })
  }
  return updates
}

/**
 * The text, font family, and visibility a node's string and boolean bindings resolve to in its
 * mode, for the fields whose stored value differs. Text, a font family, or visibility an instance
 * overrides, which typing in a layer or toggling its eye records, keeps its own value, as an
 * overridden width or height does. A font family is only named here; the editor loads its faces
 * after the reconcile (`loadBoundFonts` in Core), and the text draws in a fallback until they do.
 */
export function resolvedValueBindings(
  graph: SceneGraph,
  node: SceneNode,
  fallback: VariableModeFallback = 'active',
  resolver?: VariableResolver
): Partial<SceneNode> {
  const updates: Partial<SceneNode> = {}
  const reader = resolverFor(graph, resolver).forNode(node.id, fallback)
  const resolve = (field: 'text' | 'fontFamily' | 'visible') => {
    const variableId = node.boundVariables[field]
    if (!variableId || overriddenInInstance(graph, node.id, field)) return undefined
    return reader.value(variableId)
  }
  const text = node.type === 'TEXT' ? variableText(resolve('text')) : undefined
  if (text !== undefined && text !== node.text) updates.text = text
  const fontFamily = node.type === 'TEXT' ? variableFontFamily(resolve('fontFamily')) : undefined
  if (fontFamily !== undefined && fontFamily !== node.fontFamily) updates.fontFamily = fontFamily
  // Figma binds visibility to text too, and shows the layer when the text reads as true.
  const visible = variableTruthy(resolve('visible'))
  if (visible !== undefined && visible !== node.visible) updates.visible = visible
  return updates
}

/**
 * The icon an icon frame's `iconName` binding names in its mode, when it differs from the icon
 * it draws. Only frames that are icons resolve it; other layers keep the binding inert. The
 * caller redraws the frame, as resolving only names the icon.
 */
export function resolvedIconBinding(
  graph: SceneGraph,
  node: SceneNode,
  fallback: VariableModeFallback = 'active',
  resolver?: VariableResolver
): string | undefined {
  if (node.type !== 'FRAME') return undefined
  const icon = readIcon(node)
  if (!icon) return undefined
  const variableId = node.boundVariables['iconName']
  if (!variableId || overriddenInInstance(graph, node.id, 'iconName')) return undefined
  const resolved = resolverFor(graph, resolver).forNode(node.id, fallback).value(variableId)
  if (typeof resolved !== 'string') return undefined
  const name = resolved.trim()
  if (name === '' || name === icon.name || !ICON_NAME.test(name)) return undefined
  return name
}

/** Fields of a range of characters a bound number gives its value. */
const NUMERIC_RUN_FIELDS = ['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight'] as const

/**
 * The runs a text's character bindings resolve to in its mode, when a bound number or font family
 * differs from what its characters hold, a size or spacing in the run's binding scale for the
 * field, as a rescale left it (`runBindingScale`). Bound font styles are left as stored.
 */
export function resolvedRunBindings(
  graph: SceneGraph,
  node: SceneNode,
  fallback: VariableModeFallback = 'active',
  resolver?: VariableResolver
): Pick<Partial<SceneNode>, 'styleRuns'> {
  const reader = resolverFor(graph, resolver).forNode(node.id, fallback)
  const styleRuns = node.styleRuns.map((run): StyleRun => {
    const bound = run.style.boundVariables
    if (!bound) return run
    let style = run.style
    for (const field of NUMERIC_RUN_FIELDS) {
      const variableId = bound[field]
      if (!variableId) continue
      const value = reader.number(variableId)
      if (value === undefined || !Number.isFinite(value)) continue
      const effective = value * runBindingScale(node, style, field)
      if (!Number.isFinite(effective)) continue
      const next = boundNumberValue(field, effective)
      if (isEqual(style[field], next)) continue
      style = { ...style, [field]: next }
    }
    const familyId = bound.fontFamily
    const family = familyId ? variableFontFamily(reader.value(familyId)) : undefined
    if (family !== undefined && family !== style.fontFamily)
      style = { ...style, fontFamily: family }
    return style === run.style ? run : { ...run, style }
  })
  const changed = styleRuns.some((run, index) => run !== node.styleRuns[index])
  return changed ? { styleRuns } : {}
}

/** The variables a node binds, its own and its characters'. */
function boundVariableIds(node: SceneNode): string[] {
  return [
    ...Object.values(node.boundVariables),
    ...node.styleRuns.flatMap((run) => Object.values(run.style.boundVariables ?? {}))
  ].filter((id): id is string => typeof id === 'string')
}

/**
 * The layers a reconcile looks at: those bound to these variables, directly or through a variable
 * aliasing them, or the layers in these subtrees. Without a scope, every layer.
 */
export type BindingScope = { variables: Iterable<string> } | { subtrees: Iterable<string> }

/** These variables and every variable that aliases one of them, at any depth and in any mode. */
export function variablesResolvingThrough(graph: SceneGraph, ids: Iterable<string>): Set<string> {
  const found = new Set(ids)
  let grew = true
  while (grew) {
    grew = false
    for (const variable of graph.variables.values()) {
      if (found.has(variable.id)) continue
      const aliases = Object.values(variable.valuesByMode).some((value) =>
        variableValueReferences(value).some((id) => found.has(id))
      )
      if (aliases) {
        found.add(variable.id)
        grew = true
      }
    }
  }
  return found
}

/**
 * The collections whose variables the layers in these subtrees resolve: those they bind, and
 * those the bound variables alias, so a mode set on the subtrees can change what they show.
 */
export function collectionsBoundIn(
  graph: SceneGraph,
  roots: Iterable<string>,
  resolver?: VariableResolver
): Set<string> {
  return resolverFor(graph, resolver).dependencies(
    subtreeNodes(graph, roots).flatMap(boundVariableIds)
  )
}

/**
 * The layers a change to these variables reaches: those binding one of them, or a variable that
 * aliases one, on the layer itself or on its characters.
 */
export function layersUsingVariables(graph: SceneGraph, ids: Iterable<string>): SceneNode[] {
  const variables = variablesResolvingThrough(graph, ids)
  return [...graph.getAllNodes()].filter((node) =>
    boundVariableIds(node).some((id) => variables.has(id))
  )
}

function scopedNodes(graph: SceneGraph, scope: BindingScope | undefined): Iterable<SceneNode> {
  if (!scope) return graph.getAllNodes()
  if ('subtrees' in scope) return subtreeNodes(graph, scope.subtrees)
  return layersUsingVariables(graph, scope.variables)
}

/**
 * Resolve live numeric, text, font family, and visibility bindings, numbers in scene units, and
 * refresh bound paints whose variable's color for the layer changed (`refreshBoundPaints`),
 * without authoring instance overrides. A scope limits it to the layers a change can reach, so
 * layers whose saved values differ from their bindings elsewhere in the document are left as
 * saved.
 */
export function reconcileVariableBindings(graph: SceneGraph, scope?: BindingScope): string[] {
  const changed: string[] = []
  const nodes = [...scopedNodes(graph, scope)]
  const resolver = createVariableResolver(graph)
  for (const node of nodes) refreshBoundPaints(graph, node, resolver)
  for (const node of nodes) {
    const updates = {
      ...resolvedNumericBindings(graph, node, 'active', resolver),
      ...resolvedValueBindings(graph, node, 'active', resolver),
      ...resolvedRunBindings(graph, node, 'active', resolver)
    }
    if (Object.keys(updates).length === 0) continue
    graph.updateNode(node.id, updates)
    changed.push(node.id)
  }
  return changed
}

/** A layer list whose items carry their own bindings, keyed by position such as `fills/1/color`. */
export type BoundLayerList = 'fills' | 'strokes' | 'effects'

/**
 * `boundVariables` once the `list` items are rebuilt from `sources`, where `sources[i]` is the
 * position the new item `i` had before, or null for an added item. A binding moves with its item
 * and goes with a removed one, as Figma keeps a binding on its paint or effect.
 */
export function listBindingsAfterEdit(
  boundVariables: Readonly<Record<string, string>>,
  list: BoundLayerList,
  sources: readonly (number | null)[]
): Record<string, string> {
  const prefix = `${list}/`
  const moved: Record<string, string> = {}
  for (const [field, variableId] of Object.entries(boundVariables)) {
    if (!field.startsWith(prefix)) {
      moved[field] = variableId
      continue
    }
    const [index, ...property] = field.slice(prefix.length).split('/')
    const next = sources.indexOf(Number(index))
    if (next !== -1 && property.length > 0)
      moved[`${prefix}${next}/${property.join('/')}`] = variableId
  }
  return moved
}
