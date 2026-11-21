import type { SceneGraph } from '@pairdraw/scene-graph'
import type { DesignMemory } from '@pairdraw/scene-graph/design-memory'

import { isStyleNode, resolveDesignRules, type DesignRules } from './rules'

/**
 * What one document keeps for its design memory between checks, kept current by the graph's
 * node events, so a check never walks the whole document: the layers that define shared styles,
 * whose values join the system, and the rules last resolved, reused while the memory, those
 * styles and the variables are as they were.
 */
interface DocumentDesignState {
  styleIds: Set<string>
  styleVersion: number
  rules: {
    memory: DesignMemory
    styleVersion: number
    variables: unknown[]
    rules: DesignRules
  } | null
}

const states = new WeakMap<SceneGraph, DocumentDesignState>()

function stateOf(graph: SceneGraph): DocumentDesignState {
  const known = states.get(graph)
  if (known) return known
  const state: DocumentDesignState = { styleIds: new Set(), styleVersion: 0, rules: null }
  for (const node of graph.getAllNodes()) if (isStyleNode(node)) state.styleIds.add(node.id)
  const touched = (id: string) => {
    const node = graph.getNode(id)
    const isStyle = node !== undefined && isStyleNode(node)
    if (!isStyle && !state.styleIds.has(id)) return
    if (isStyle) state.styleIds.add(id)
    else state.styleIds.delete(id)
    state.styleVersion++
  }
  graph.onNodeEvents({
    created: (node) => touched(node.id),
    updated: (id) => touched(id),
    deleted: (id) => touched(id)
  })
  states.set(graph, state)
  return state
}

/** Every reference a variable's values could change through, in a fixed order. */
function variableFingerprint(graph: SceneGraph): unknown[] {
  const refs: unknown[] = []
  for (const variable of graph.variables.values()) {
    refs.push(variable, variable.type, variable.scopes?.join(','), variable.valuesByMode)
    for (const value of Object.values(variable.valuesByMode)) refs.push(value)
  }
  for (const collection of graph.variableCollections.values()) refs.push(collection.modes)
  return refs
}

function sameRefs(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

/**
 * The memory's rules resolved against the document as it is now, reused while the memory, the
 * style layers and the variables have not changed since they were last resolved.
 */
export function currentDesignRules(graph: SceneGraph, memory: DesignMemory): DesignRules {
  const state = stateOf(graph)
  const variables = variableFingerprint(graph)
  const cached = state.rules
  if (
    cached?.memory === memory &&
    cached.styleVersion === state.styleVersion &&
    sameRefs(cached.variables, variables)
  )
    return cached.rules
  const styles = [...state.styleIds].flatMap((id) => graph.getNode(id) ?? [])
  const rules = resolveDesignRules(graph, memory, styles)
  state.rules = { memory, styleVersion: state.styleVersion, variables, rules }
  return rules
}
