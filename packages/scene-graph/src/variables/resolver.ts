import type { SceneGraph } from '../graph'
import type { Color } from '../primitives'
import type { VariableLiteral, VariableValue } from '../types'
import {
  collectionsResolving,
  getActiveModeId,
  getNodeExplicitVariableModeId,
  getNodeVariableModeId,
  resolveVariableInModes,
  resolvedVariableModes,
  type VariableModeFallback
} from './resolution'

/** One reader per mode context; completed values are shared inside the resolver. */
export interface VariableReader {
  /** Any variable type, following aliases and expressions. Undefined when it cannot resolve. */
  value(variableId: string): VariableLiteral | undefined
  /** Strict form for formula drafts and diagnostics; throws VariableResolutionError. */
  resolve(variableId: string): VariableLiteral
  /** Stored value in this context's mode, with no default fallback; aliases are followed. */
  stored(variableId: string): VariableValue | undefined

  color(variableId: string): Color | undefined
  number(variableId: string): number | undefined
  string(variableId: string): string | undefined
  boolean(variableId: string): boolean | undefined
}

export interface VariableResolver {
  forNode(nodeId: string, fallback?: VariableModeFallback): VariableReader
  active(): VariableReader
  forMode(collectionId: string, modeId: string): VariableReader
  forModes(modeFor: (collectionId: string) => string): VariableReader

  activeMode(collectionId: string): string
  modeFor(nodeId: string, collectionId: string, fallback?: VariableModeFallback): string
  explicitModeFor(nodeId: string, collectionId: string): string | null
  modesFor(nodeId: string): Record<string, string>
  dependencies(variableIds: Iterable<string>): Set<string>
}

export interface VariableResolverOptions {
  /** Draft values for formula validation; stored reads still use the graph. */
  overrides?: ReadonlyMap<string, VariableValue>
}

function isColor(value: VariableLiteral): value is Color {
  return typeof value === 'object' && 'r' in value
}

function reader(
  graph: SceneGraph,
  modeFor: (collectionId: string) => string,
  overrides?: ReadonlyMap<string, VariableValue>
): VariableReader {
  const memo = new Map<string, VariableLiteral>()
  const storedValues = new Map<string, VariableValue | undefined>()

  const strict = (variableId: string) =>
    resolveVariableInModes(graph, variableId, modeFor, new Set(), memo, overrides)

  const value = (variableId: string): VariableLiteral | undefined => {
    try {
      return strict(variableId)
    } catch {
      return undefined
    }
  }

  const stored = (variableId: string): VariableValue | undefined => {
    if (storedValues.has(variableId)) return storedValues.get(variableId)
    const visiting = new Set<string>()
    let id = variableId
    for (;;) {
      if (visiting.has(id)) return undefined
      visiting.add(id)
      const variable = graph.variables.get(id)
      if (!variable || !graph.variableCollections.has(variable.collectionId)) return undefined
      const mode = modeFor(variable.collectionId)
      const valueInMode = variable.valuesByMode[mode]
      if (!Object.hasOwn(variable.valuesByMode, mode)) return undefined
      if (valueInMode && typeof valueInMode === 'object' && 'aliasId' in valueInMode) {
        id = valueInMode.aliasId
        continue
      }
      storedValues.set(variableId, valueInMode)
      return valueInMode
    }
  }

  return {
    value,
    resolve: strict,
    stored,
    color: (variableId) => {
      const resolved = value(variableId)
      return resolved !== undefined && isColor(resolved) ? resolved : undefined
    },
    number: (variableId) => {
      const resolved = value(variableId)
      return typeof resolved === 'number' ? resolved : undefined
    },
    string: (variableId) => {
      const resolved = value(variableId)
      return typeof resolved === 'string' ? resolved : undefined
    },
    boolean: (variableId) => {
      const resolved = value(variableId)
      return typeof resolved === 'boolean' ? resolved : undefined
    }
  }
}

/**
 * One value resolver for canvas, editor, exports and tools. Create one per operation: the
 * memo is only valid for the graph state it was built against.
 */
export function createVariableResolver(
  graph: SceneGraph,
  options: VariableResolverOptions = {}
): VariableResolver {
  const readers = new Map<string, VariableReader>()
  const overrides = options.overrides

  const cached = (key: string, create: () => VariableReader): VariableReader => {
    let found = readers.get(key)
    if (!found) {
      found = create()
      readers.set(key, found)
    }
    return found
  }

  return {
    forNode(nodeId, fallback = 'active') {
      return cached(`node:${fallback}:${nodeId}`, () =>
        reader(
          graph,
          (collectionId) => getNodeVariableModeId(graph, nodeId, collectionId, fallback),
          overrides
        )
      )
    },
    active() {
      return cached('active', () => reader(graph, (id) => getActiveModeId(graph, id), overrides))
    },
    forMode(collectionId, modeId) {
      return cached(JSON.stringify(['mode', collectionId, modeId]), () =>
        reader(
          graph,
          (id) => (id === collectionId ? modeId : getActiveModeId(graph, id)),
          overrides
        )
      )
    },
    forModes(modeFor) {
      return reader(graph, modeFor, overrides)
    },
    activeMode: (collectionId) => getActiveModeId(graph, collectionId),
    modeFor: (nodeId, collectionId, fallback = 'active') =>
      getNodeVariableModeId(graph, nodeId, collectionId, fallback),
    explicitModeFor: (nodeId, collectionId) =>
      getNodeExplicitVariableModeId(graph, nodeId, collectionId),
    modesFor: (nodeId) => resolvedVariableModes(graph, nodeId),
    dependencies: (variableIds) => collectionsResolving(graph, variableIds)
  }
}
