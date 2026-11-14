import {
  collectionVariables,
  defaultModeCondition,
  modeConditionKey,
  variableCSSNames
} from '@pairdraw/dom-css/export'
import {
  isLibraryCollection,
  type SceneGraph,
  type Variable,
  type VariableCollection,
  type VariableCollectionMode
} from '@pairdraw/scene-graph'

/** A variable the stylesheet names, with the collection that holds it. */
export interface KnownVariable {
  variable: Variable
  collection: VariableCollection
  /** Whether a library holds it, so an import leaves it alone. */
  library: boolean
}

export interface KnownMode {
  collection: VariableCollection
  mode: VariableCollectionMode
}

/** The document's variables by custom property name, and its modes by the scope they apply in. */
export interface KnownTokens {
  byCSSName: Map<string, KnownVariable>
  byCondition: Map<string, KnownMode>
}

/**
 * What a stylesheet's names and scopes are in this document, as its token stylesheet writes them:
 * each variable by the custom property it is written as, and each mode other than a collection's
 * default by its condition, compared in the form `modeConditionKey` gives.
 */
export function knownTokens(graph: SceneGraph): KnownTokens {
  const variables = collectionVariables(graph)
  const names = variableCSSNames(variables)
  const byCSSName = new Map<string, KnownVariable>()
  for (const variable of variables) {
    const collection = graph.variableCollections.get(variable.collectionId)
    const name = names.get(variable.id)
    if (!collection || !name) continue
    byCSSName.set(name, { variable, collection, library: isLibraryCollection(collection) })
  }
  const byCondition = new Map<string, KnownMode>()
  for (const collection of graph.variableCollections.values()) {
    if (isLibraryCollection(collection)) continue
    for (const mode of collection.modes) {
      if (mode.modeId === collection.defaultModeId) continue
      const key = modeConditionKey(mode.condition ?? defaultModeCondition(collection, mode))
      if (!byCondition.has(key)) byCondition.set(key, { collection, mode })
    }
  }
  return { byCSSName, byCondition }
}
