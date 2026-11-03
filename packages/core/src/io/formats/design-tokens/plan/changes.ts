import { isEqual } from 'es-toolkit/predicate'

import type { SceneGraph, VariableValue } from '@open-pencil/scene-graph'

import type { PlannedCollection, PlannedValue, TokenImportPlan } from './index'

/** The value a planned one sets, or undefined where it points at a variable the import adds. */
function plannedValue(plan: TokenImportPlan, value: PlannedValue): VariableValue | undefined {
  if (value.kind === 'literal') return value.value
  const { target } = value
  if (target.kind === 'variable') return { aliasId: target.variableId }
  const existingId = plan.collections[target.collection]?.variables[target.variable]?.existingId
  return existingId ? { aliasId: existingId } : undefined
}

function collectionChanges(
  graph: SceneGraph,
  plan: TokenImportPlan,
  collection: PlannedCollection
): number {
  if (collection.target.kind === 'new') return collection.variables.length + 1
  const newModes = collection.modes.filter((mode) => mode.target.kind === 'new').length
  let changed = newModes
  for (const variable of collection.variables) {
    const current = variable.existingId ? graph.variables.get(variable.existingId) : undefined
    if (!current) {
      changed++
      continue
    }
    // A changed unit or CSS expression counts even where the number it comes to is the same.
    const unitChanged = variable.unit !== undefined && variable.unit !== current.unit
    const differs = variable.values.some((value, index) => {
      const target = collection.modes.at(index)?.target
      if (!value || !target) return false
      if (target.kind !== 'existing') return true
      const next = plannedValue(plan, value)
      if (next === undefined || !isEqual(current.valuesByMode[target.modeId], next)) return true
      return variable.expressions[index] !== current.expressions?.[target.modeId]?.css
    })
    if (unitChanged || differs) changed++
  }
  return changed
}

/**
 * How many things an import would change: collections and modes it adds, variables it adds, and
 * variables whose values it changes, so an import that would only write what the document already
 * has can be left out. Styles count whenever they are planned.
 */
export function countTokenImportChanges(graph: SceneGraph, plan: TokenImportPlan): number {
  return plan.collections.reduce(
    (count, collection) => count + collectionChanges(graph, plan, collection),
    plan.styles.length
  )
}
