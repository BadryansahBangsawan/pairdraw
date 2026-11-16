import type { SceneNode } from '../types'
import { NUMERIC_FIELDS } from './fields'

/**
 * Numbers a text's characters bind that a rescale scales with the layer. Their bindings share
 * the layer's scale for the field, as the rescale scales the layer and its characters alike.
 */
export const SCALED_RUN_BINDING_FIELDS: ReadonlySet<string> = new Set([
  'fontSize',
  'letterSpacing',
  'lineHeight'
])

function runsBind(node: SceneNode, field: string): boolean {
  return (
    SCALED_RUN_BINDING_FIELDS.has(field) &&
    node.styleRuns.some((run) => Object.hasOwn(run.style.boundVariables ?? {}, field))
  )
}

export function scaleVariableBindingUnits(node: SceneNode, factor: number): Partial<SceneNode> {
  const variableBindingScales = { ...node.variableBindingScales }
  const variableAssignmentScales = { ...node.variableAssignmentScales }
  for (const field of NUMERIC_FIELDS) {
    // A rescale keeps opacity, rotation, and font weight as they are.
    if (field === 'opacity' || field === 'rotation' || field === 'fontWeight') continue
    if (field in node.boundVariables || runsBind(node, field))
      variableBindingScales[field] = (variableBindingScales[field] ?? 1) * factor
    if (node.type === 'INSTANCE')
      variableAssignmentScales[field] = (variableAssignmentScales[field] ?? 1) * factor
  }
  return { variableBindingScales, variableAssignmentScales }
}
