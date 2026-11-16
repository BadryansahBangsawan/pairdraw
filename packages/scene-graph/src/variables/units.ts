import { omit, pickBy } from 'es-toolkit/object'
import { isEmptyObject } from 'es-toolkit/predicate'

import type { CharacterStyleOverride, SceneNode, StyleRun, TextBindableField } from '../types'
import { NUMERIC_FIELDS } from './fields'

const SCALED_RUN_BINDING_FIELD_LIST = ['fontSize', 'letterSpacing', 'lineHeight'] as const

/** A size or spacing a text's characters bind that a rescale scales with the layer. */
export type ScaledRunBindingField = (typeof SCALED_RUN_BINDING_FIELD_LIST)[number]

/**
 * Numbers a text's characters bind that a rescale scales with the layer. Each run keeps its own
 * scale for the field, because the rescale scales the layer and its characters alike.
 */
export const SCALED_RUN_BINDING_FIELDS: ReadonlySet<string> = new Set(SCALED_RUN_BINDING_FIELD_LIST)

/**
 * The scale a run's binding of `field` resolves with: the run's own, else, for a run saved before
 * runs kept one, the layer's scale for a size or spacing, as every run once shared it.
 */
export function runBindingScale(
  node: Pick<SceneNode, 'variableBindingScales'>,
  style: CharacterStyleOverride,
  field: TextBindableField
): number {
  const own = style.variableBindingScales?.[field]
  if (own !== undefined) return own
  return SCALED_RUN_BINDING_FIELDS.has(field) ? (node.variableBindingScales[field] ?? 1) : 1
}

/** A run's style keeping scales only for the numbers it still binds, and no empty scales. */
export function withBoundBindingScales(style: CharacterStyleOverride): CharacterStyleOverride {
  if (!Object.hasOwn(style, 'variableBindingScales')) return style
  const scales = pickBy(
    style.variableBindingScales ?? {},
    (_, field) => style.boundVariables?.[field] !== undefined
  )
  if (isEmptyObject(scales)) return omit(style, ['variableBindingScales'])
  return { ...style, variableBindingScales: scales }
}

/** `runs` with each binding of `fields` holding `next` of the scale it resolves with. */
function runsWithBindingScales(
  node: SceneNode,
  runs: readonly StyleRun[],
  fields: readonly ScaledRunBindingField[],
  next: (scale: number) => number
): StyleRun[] | undefined {
  const styleRuns = runs.map((run) => {
    const bound = run.style.boundVariables
    if (!bound) return run
    let scales = run.style.variableBindingScales
    for (const field of fields) {
      if (!bound[field]) continue
      const scale = next(runBindingScale(node, run.style, field))
      if (scales?.[field] !== scale) scales = { ...scales, [field]: scale }
    }
    if (scales === run.style.variableBindingScales) return run
    return { ...run, style: { ...run.style, variableBindingScales: scales } }
  })
  return styleRuns.some((run, index) => run !== runs[index]) ? styleRuns : undefined
}

/**
 * The runs with every size or spacing they bind holding the scale it resolves with as their own,
 * or `undefined` when each already does. Called before the layer's scale for a field changes or
 * goes, it migrates a run that still resolves with the layer's, so the run keeps its look.
 */
export function pinnedRunBindingScales(
  node: SceneNode,
  fields: readonly string[] = SCALED_RUN_BINDING_FIELD_LIST
): StyleRun[] | undefined {
  const scaled = SCALED_RUN_BINDING_FIELD_LIST.filter((field) => fields.includes(field))
  if (scaled.length === 0) return undefined
  return runsWithBindingScales(node, node.styleRuns, scaled, (scale) => scale)
}

/**
 * The binding scales of a layer rescaled by `factor`. `styleRuns` are the runs the rescale leaves,
 * when it also scales their values, so each keeps them and gains its own scales.
 */
export function scaleVariableBindingUnits(
  node: SceneNode,
  factor: number,
  styleRuns: readonly StyleRun[] = node.styleRuns
): Partial<SceneNode> {
  const variableBindingScales = { ...node.variableBindingScales }
  const variableAssignmentScales = { ...node.variableAssignmentScales }
  for (const field of NUMERIC_FIELDS) {
    // A rescale keeps opacity, rotation, and font weight as they are.
    if (field === 'opacity' || field === 'rotation' || field === 'fontWeight') continue
    if (field in node.boundVariables)
      variableBindingScales[field] = (variableBindingScales[field] ?? 1) * factor
    if (node.type === 'INSTANCE')
      variableAssignmentScales[field] = (variableAssignmentScales[field] ?? 1) * factor
  }
  // Each run scales the sizes and spacings it binds in its own scale.
  const scaledRuns = runsWithBindingScales(
    node,
    styleRuns,
    SCALED_RUN_BINDING_FIELD_LIST,
    (scale) => scale * factor
  )
  return scaledRuns
    ? { variableBindingScales, variableAssignmentScales, styleRuns: scaledRuns }
    : { variableBindingScales, variableAssignmentScales }
}
