import type { SceneGraph, SceneNode, Variable } from '@pairdraw/scene-graph'
import { colorToHex } from '@pairdraw/scene-graph/color'
import {
  cachedDesignMemory,
  DESIGN_MEMORY_GROUPS,
  normalizeDesignValue,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'
import { findInstanceAncestor, hasInstanceOverride } from '@pairdraw/scene-graph/instances'

import { DEFAULT_FONT_FAMILY } from '#core/constants'
import { newLayerDefaults } from '#core/editor/shapes/defaults'

import { currentDesignRules } from './document'
import {
  COLOR_TOLERANCE,
  isStyleNode,
  nearestColor,
  nearestNumber,
  NUMBER_TOLERANCE,
  styleValues,
  variableValues,
  type AllowedValue,
  type DesignRules,
  type SystemValue
} from './rules'
import { copiedValueKey, designValueKey, designValues, type DesignValue } from './values'

/** A value that breaks the memory, with the closest one it allows. */
export interface DesignViolation {
  group: DesignMemoryGroup
  severity: 'refuse' | 'warn'
  /** The layer, or the variable, that holds the value. */
  nodeId: string
  nodeName: string
  path: string
  value: string | number
  nearest: AllowedValue<string | number> | null
}

export interface DesignFindings {
  refused: DesignViolation[]
  warnings: DesignViolation[]
  /** The rules the edit was judged by; null when it brought no values to judge. */
  rules: DesignRules | null
}

/**
 * What an edit did: the layers it created, the fields it changed on others with their values
 * before, the layers it deleted as they were, and the variables it created or changed.
 */
export interface DesignEdit {
  created: readonly Pick<SceneNode, 'id'>[]
  updated: readonly { id: string; before: Partial<SceneNode>; after: Partial<SceneNode> }[]
  deleted?: readonly SceneNode[]
  /** Each variable created (`before` null) or changed, with what it held before. */
  variables?: readonly { id: string; before: Partial<Variable> | null }[]
}

export interface DesignCheckOptions {
  /**
   * Report what the memory would refuse as warnings: for outside content, such as an imported
   * web page, SVG or photo, whose values are its own, and for a call a person made.
   */
  warnOnly?: boolean
  /**
   * The rules as they were before the edit, so nothing the edit itself did, such as a variable
   * it created, widens what it is judged by. Resolved from the document now when absent.
   */
  rules?: DesignRules
  /**
   * The layers a call copies or converts with their values, such as a clone's original or the
   * layers a boolean joins: a value they already had is not new on what the call made of them.
   * Any other call is judged only against what the memory allows, wherever else a value is used.
   */
  copiedFrom?: readonly string[]
}

/** The neutral colors and the font Pairdraw gives a new layer of every kind. */
const PAIRDRAW_DEFAULT_KEYS: ReadonlySet<string> = new Set([
  designValueKey('fonts', DEFAULT_FONT_FAMILY),
  ...(['FRAME', 'COMPONENT', 'SECTION', 'RECTANGLE', 'LINE', 'TEXT'] as const).flatMap((type) =>
    (['light', 'dark'] as const).flatMap((theme) => {
      const { fills = [], strokes = [] } = newLayerDefaults(type, theme)
      return [...fills, ...strokes].map((paint) =>
        designValueKey('colors', colorToHex(paint.color))
      )
    })
  )
])

/** Judges one value; null when the memory allows it or does not check its group. */
function judge(
  rules: DesignRules,
  node: Pick<SceneNode, 'id' | 'name'>,
  value: DesignValue
): DesignViolation | null {
  const group = rules[value.group]
  if (group.enforce === 'off' || (value.fromSystem && group.fromSystem)) return null
  let nearest: AllowedValue<string | number> | null = null
  if (value.group === 'colors' && typeof value.value === 'string') {
    const match = nearestColor(rules.colors, value.value)
    if (match && match.distance <= COLOR_TOLERANCE) return null
    nearest = match?.allowed ?? null
  } else if (value.group === 'fonts' && typeof value.value === 'string') {
    const family = value.value.toLowerCase()
    if (rules.fonts.allowed.some((allowed) => allowed.value.toLowerCase() === family)) return null
  } else if (
    typeof value.value === 'number' &&
    value.group !== 'colors' &&
    value.group !== 'fonts'
  ) {
    const match = nearestNumber(rules[value.group], value.value)
    if (match && Math.abs(match.value - value.value) <= NUMBER_TOLERANCE) return null
    nearest = match
  }
  return {
    group: value.group,
    severity: group.enforce === 'refuse' && !value.soft ? 'refuse' : 'warn',
    nodeId: node.id,
    nodeName: node.name,
    path: value.path,
    value: value.value,
    nearest
  }
}

/** The values on a layer that break the memory, as lint lists them. */
export function designViolations(rules: DesignRules, node: SceneNode): DesignViolation[] {
  const violations: DesignViolation[] = []
  for (const value of designValues(node)) {
    const violation = judge(rules, node, value)
    if (violation) violations.push(violation)
  }
  return violations
}

const keyOf = (value: DesignValue | SystemValue) => designValueKey(value.group, value.value)

/**
 * The values an edit brought to a layer: on a layer it created, all of them; on one it changed,
 * those in the fields it changed that the same field did not hold before, as a value that is
 * judged in full, so moving or renaming an old layer judges nothing. A layer inside an instance shows its component's values, so only
 * the fields it overrides are its own.
 */
function editedValues(
  graph: SceneGraph,
  node: SceneNode,
  change: DesignEdit['updated'][number] | null
): DesignValue[] {
  const inInstance = findInstanceAncestor(graph, node.id) !== undefined
  const own = (value: DesignValue) =>
    !inInstance || hasInstanceOverride(graph, node.id, String(value.field))
  let values = designValues(node).filter(own)
  if (change) {
    const changed = new Set(Object.keys(change.after))
    values = values.filter((value) => changed.has(String(value.field)))
    // Held before means in the same field and as solid a value: a shadow or gradient stop that
    // only warned never vouches for a fill or stroke of the same color.
    const heldKey = (value: DesignValue) => `${String(value.field)}|${copiedValueKey(value)}`
    const previous = new Set(designValues({ ...node, ...change.before }).map(heldKey))
    values = values.filter((value) => !previous.has(heldKey(value)))
  }
  return values
}

/**
 * The values a variable an edit created or changed now gives the system, under its type and
 * scopes as they are now, so a rescoped variable is judged on what it newly admits.
 */
function editedVariableValues(
  graph: SceneGraph,
  change: NonNullable<DesignEdit['variables']>[number]
): { variable: Variable; values: SystemValue[] } | null {
  const variable = graph.variables.get(change.id)
  if (!variable) return null
  const values = variableValues(graph, variable)
  return values.length > 0 ? { variable, values } : null
}

/** The values a style layer an edit created or changed now gives the system. */
function editedStyleValues(node: SceneNode): SystemValue[] {
  return isStyleNode(node) ? styleValues(node) : []
}

function systemValue(value: SystemValue, path: string): DesignValue {
  return { ...value, field: 'name', path, fromSystem: false, soft: false }
}

/** The values one layer, style or variable got from an edit, and whether a layer holds them. */
interface BroughtValues {
  owner: Pick<SceneNode, 'id' | 'name'>
  values: DesignValue[]
  layer: boolean
}

/** Every value an edit brought in: on layers, in the styles they define, and in variables. */
function broughtValues(graph: SceneGraph, edit: DesignEdit): BroughtValues[] {
  const brought: BroughtValues[] = []
  const visit = (id: string, change: DesignEdit['updated'][number] | null) => {
    const node = graph.getNode(id)
    if (!node) return
    const values = editedValues(graph, node, change)
    if (values.length > 0) brought.push({ owner: node, values, layer: true })
    const styles = editedStyleValues(node).map((value) => systemValue(value, 'style'))
    if (styles.length > 0) brought.push({ owner: node, values: styles, layer: false })
  }
  for (const node of edit.created) visit(node.id, null)
  for (const change of edit.updated) visit(change.id, change)
  for (const change of edit.variables ?? []) {
    const edited = editedVariableValues(graph, change)
    if (!edited) continue
    brought.push({
      owner: { id: edited.variable.id, name: edited.variable.name },
      values: edited.values.map((value) => systemValue(value, 'variable')),
      layer: false
    })
  }
  return brought
}

/**
 * The values on the layers a copying call names, as they were before it: their subtrees, read
 * as they were where the call changed them, and the layers it deleted, such as a boolean's
 * operands. Only the named layers are read, never the rest of the document.
 */
function copiedValues(
  graph: SceneGraph,
  edit: DesignEdit,
  sourceIds: readonly string[]
): Set<string> {
  const keys = new Set<string>()
  const add = (node: SceneNode) => {
    for (const value of designValues(node)) keys.add(copiedValueKey(value))
  }
  for (const node of edit.deleted ?? []) add(node)
  const created = new Set(edit.created.map((node) => node.id))
  const before = new Map(edit.updated.map((change) => [change.id, change.before]))
  const pending = [...sourceIds]
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const node = created.has(id) ? undefined : graph.getNode(id)
    if (!node) continue
    const previous = before.get(id)
    const layer = previous ? { ...node, ...previous } : node
    add(layer)
    pending.push(...layer.childIds)
  }
  return keys
}

/**
 * A value written on a layer, as it is judged: none when a copied layer already had it, and
 * only a warning for Pairdraw's own default for a new layer, which the agent did not choose.
 */
function layerValue(value: DesignValue, copied: Set<string> | null): DesignValue | null {
  if (copied?.has(copiedValueKey(value))) return null
  return PAIRDRAW_DEFAULT_KEYS.has(keyOf(value)) ? { ...value, soft: true } : value
}

/** A variable's or style's value, judged only where the group takes the system's values. */
function systemValueIn(rules: DesignRules, value: DesignValue): DesignValue | null {
  return rules[value.group].fromSystem ? value : null
}

/**
 * Judges what an edit did against the document's design memory; null when the document has
 * none. Only values the edit brought in are judged, against the rules as they were before it:
 * - a value written onto a layer is judged against what the memory allows, wherever else the
 *   document uses it, unless the call copied or converted layers that already had it
 *   (`copiedFrom`);
 * - Pairdraw's own defaults for a new layer warn at most: the agent did not choose them;
 * - variables and shared styles are judged on every value they now give the system, under their
 *   scopes as they are now, so creating, changing or rescoping one cannot widen the rules;
 *   binding layers to the existing system stays free.
 * People's edits are never judged here, only agents' and automation's.
 */
export function checkDesignEdit(
  graph: SceneGraph,
  edit: DesignEdit,
  options: DesignCheckOptions = {}
): DesignFindings | null {
  const memory = options.rules?.memory ?? cachedDesignMemory(graph)
  if (!memory) return null
  const findings: DesignFindings = { refused: [], warnings: [], rules: null }
  const pending = broughtValues(graph, edit)
  // Resolving the rules costs more than the check, so only an edit that brought values pays.
  if (pending.length === 0) return findings
  const rules = options.rules ?? currentDesignRules(graph, memory)
  findings.rules = rules
  const copied = options.copiedFrom?.length ? copiedValues(graph, edit, options.copiedFrom) : null
  for (const { owner, values, layer } of pending) {
    for (const value of values) {
      const judged = layer ? layerValue(value, copied) : systemValueIn(rules, value)
      if (!judged) continue
      const violation = judge(rules, owner, judged)
      if (!violation) continue
      if (violation.severity === 'refuse' && !options.warnOnly) findings.refused.push(violation)
      else findings.warnings.push({ ...violation, severity: 'warn' })
    }
  }
  return findings
}

/** A value proposed for a design, judged before it is used. */
export interface DesignValueVerdict {
  group: DesignMemoryGroup
  value: string | number
  /** `invalid` for a value the group cannot read, such as a color that is not CSS. */
  verdict: 'ok' | 'warn' | 'refuse' | 'invalid'
  nearest: AllowedValue<string | number> | null
}

/** Judges values an agent means to use, so it can pick allowed ones before it edits. */
export function checkDesignValues(
  rules: DesignRules,
  proposal: Partial<Record<DesignMemoryGroup, readonly (string | number)[]>>
): DesignValueVerdict[] {
  const probe = { id: '', name: '' }
  return DESIGN_MEMORY_GROUPS.flatMap((group) =>
    (proposal[group] ?? []).map((input): DesignValueVerdict => {
      const value = normalizeDesignValue(group, input)
      if (value === null) return { group, value: input, verdict: 'invalid', nearest: null }
      const violation = judge(rules, probe, {
        group,
        field: 'name',
        path: group,
        value,
        fromSystem: false,
        soft: false
      })
      return {
        group,
        value,
        verdict: violation?.severity ?? 'ok',
        nearest: violation?.nearest ?? null
      }
    })
  )
}
