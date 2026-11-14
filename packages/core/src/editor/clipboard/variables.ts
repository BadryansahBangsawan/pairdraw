import type { SceneGraph, SceneNode, Variable, VariableCollection } from '@pairdraw/scene-graph'
import { numberedName } from '@pairdraw/scene-graph/naming'
import { remapStyleRunReferences, styleRunReferences } from '@pairdraw/scene-graph/text'
import {
  isUnsupportedVariableValue,
  mapVariableValueReferences,
  variableValueReferences
} from '@pairdraw/scene-graph/variables'

import type { ClipboardCollectionMerge } from './conflicts'

export interface ClipboardVariables {
  activeModes: Array<[string, string]>
  variables: Variable[]
  collections: VariableCollection[]
}

export function captureClipboardVariables(
  graph: SceneGraph,
  nodes: SceneNode[]
): ClipboardVariables {
  const variables = new Map<string, Variable>()
  const collections = new Map<string, VariableCollection>()
  function capture(collection: VariableCollection | undefined) {
    if (collection && !collections.has(collection.id))
      collections.set(collection.id, structuredClone(collection))
  }
  function visit(id: string) {
    if (variables.has(id)) return
    const variable = graph.variables.get(id)
    if (!variable) return
    variables.set(id, structuredClone(variable))
    capture(graph.variableCollections.get(variable.collectionId))
    for (const value of Object.values(variable.valuesByMode)) {
      for (const reference of variableValueReferences(value)) visit(reference)
      // A kept expression can name a mode of a collection none of its aliases reach.
      if (isUnsupportedVariableValue(value))
        for (const modeId of value.modes)
          capture(
            [...graph.variableCollections.values()].find((collection) =>
              collection.modes.some((mode) => mode.modeId === modeId)
            )
          )
    }
  }
  for (const node of nodes) {
    for (const id of Object.values(node.boundVariables)) visit(id)
    for (const id of styleRunReferences(node.styleRuns).variables) visit(id)
  }
  const activeModes: Array<[string, string]> = []
  for (const collectionId of collections.keys()) {
    const modeId = graph.activeMode.get(collectionId)
    if (modeId) activeModes.push([collectionId, modeId])
  }
  return { activeModes, variables: [...variables.values()], collections: [...collections.values()] }
}

/**
 * The copied variables as this document takes them. A collection in `merges` goes into the
 * document's collection it names: its variables bind to the same-named ones there, and those
 * missing are added to it. Every other collection is added, under a free name when `renamed`
 * names it. New ids come from the graph's generator. Nothing changes until `apply`.
 */
export function importClipboardVariables(
  graph: SceneGraph,
  dependencies: ClipboardVariables,
  merges: ReadonlyMap<string, ClipboardCollectionMerge> = new Map(),
  renamed: ReadonlySet<string> = new Set()
) {
  const newId = graph.entityIdMinter()
  const variableIds = new Map<string, string>()
  const collectionIds = new Map<string, string>()
  const modeIds = new Map<string, string>()
  /** Modes of merged collections the document has no match for: layers set to one inherit. */
  const droppedModes = new Set<string>()
  const sourceCollections = new Map(
    dependencies.collections.map((collection) => [collection.id, collection])
  )
  for (const collection of dependencies.collections) {
    const merge = merges.get(collection.id)
    collectionIds.set(collection.id, merge?.collectionId ?? newId())
    for (const mode of collection.modes) {
      const modeId = merge ? merge.modes.get(mode.modeId) : newId()
      if (modeId) modeIds.set(mode.modeId, modeId)
      else droppedModes.add(mode.modeId)
    }
  }
  const existingByName = new Map<string, Map<string, Variable>>()
  const existingNames = (collectionId: string) => {
    const names = existingByName.get(collectionId) ?? variablesByName(graph, collectionId)
    existingByName.set(collectionId, names)
    return names
  }
  const reused = new Set<string>()
  for (const variable of dependencies.variables) {
    const merge = merges.get(variable.collectionId)
    const match = merge ? existingNames(merge.collectionId).get(variable.name) : undefined
    if (match && match.type === variable.type) {
      variableIds.set(variable.id, match.id)
      reused.add(variable.id)
    } else variableIds.set(variable.id, newId())
  }
  const mapVariable = (id: string) => variableIds.get(id) ?? id
  const mapMode = (id: string) => modeIds.get(id) ?? id

  const takenCollectionNames = [...graph.variableCollections.values()].map(({ name }) => name)
  const collections = dependencies.collections
    .filter((collection) => !merges.has(collection.id))
    .map((collection) => {
      const name = renamed.has(collection.id)
        ? numberedName(collection.name, takenCollectionNames)
        : collection.name
      takenCollectionNames.push(name)
      return {
        ...structuredClone(collection),
        id: collectionIds.get(collection.id) ?? collection.id,
        name,
        modes: collection.modes.map((mode) => ({ ...mode, modeId: mapMode(mode.modeId) })),
        defaultModeId: mapMode(collection.defaultModeId),
        variableIds: collection.variableIds.flatMap((id) => {
          const mapped = variableIds.get(id)
          return mapped ? [mapped] : []
        })
      }
    })

  /** Mode ids of the collection a variable lands in, each with the source mode it reads. */
  function targetModes(variable: Variable): Array<[target: string, source: string]> {
    const merge = merges.get(variable.collectionId)
    const target = merge ? graph.variableCollections.get(merge.collectionId) : undefined
    if (!merge || !target)
      return Object.keys(variable.valuesByMode).map((mode) => [mapMode(mode), mode])
    const fallback =
      sourceCollections.get(variable.collectionId)?.defaultModeId ??
      Object.keys(variable.valuesByMode)[0]
    const sourceOf = new Map([...merge.modes].map(([source, mode]) => [mode, source]))
    return target.modes.map((mode) => [mode.modeId, sourceOf.get(mode.modeId) ?? fallback])
  }

  const namesIn = new Map<string, string[]>()
  const variables = dependencies.variables
    .filter((variable) => !reused.has(variable.id))
    .map((variable): Variable => {
      const collectionId = collectionIds.get(variable.collectionId) ?? variable.collectionId
      const names =
        namesIn.get(collectionId) ??
        (merges.has(variable.collectionId) ? [...existingNames(collectionId).keys()] : [])
      const name = merges.has(variable.collectionId)
        ? numberedName(variable.name, names)
        : variable.name
      names.push(name)
      namesIn.set(collectionId, names)
      const valuesByMode: Variable['valuesByMode'] = {}
      const expressions: NonNullable<Variable['expressions']> = {}
      for (const [target, source] of targetModes(variable)) {
        if (source in variable.valuesByMode)
          valuesByMode[target] = mapVariableValueReferences(
            variable.valuesByMode[source],
            mapVariable,
            mapMode
          )
        const expression = variable.expressions?.[source]
        if (expression) expressions[target] = structuredClone(expression)
      }
      return {
        ...structuredClone(variable),
        id: mapVariable(variable.id),
        name,
        collectionId,
        valuesByMode,
        ...(variable.expressions ? { expressions } : {})
      }
    })
  const addedToExisting = variables
    .filter(
      (variable) => !collections.some((collection) => collection.id === variable.collectionId)
    )
    .map((variable) => variable.id)

  function apply() {
    for (const collection of collections) graph.addCollection(structuredClone(collection))
    for (const variable of variables) graph.addVariable(structuredClone(variable))
    for (const [collectionId, modeId] of dependencies.activeModes) {
      if (merges.has(collectionId)) continue
      const nextCollectionId = collectionIds.get(collectionId)
      const nextModeId = modeIds.get(modeId)
      if (nextCollectionId && nextModeId) graph.activeMode.set(nextCollectionId, nextModeId)
    }
  }
  function revert() {
    for (const id of addedToExisting) graph.removeVariable(id)
    for (const collection of collections) graph.removeCollection(collection.id)
  }
  return { variableIds, collectionIds, modeIds, droppedModes, apply, revert }
}

/** A collection's variables by name, the first of a repeated name winning. */
function variablesByName(graph: SceneGraph, collectionId: string): Map<string, Variable> {
  const byName = new Map<string, Variable>()
  for (const id of graph.variableCollections.get(collectionId)?.variableIds ?? []) {
    const variable = graph.variables.get(id)
    if (variable && !byName.has(variable.name)) byName.set(variable.name, variable)
  }
  return byName
}

/** Remap only declared references; never rewrite arbitrary node strings. */
export function remapClipboardVariableBindings(
  node: SceneNode,
  variables: ReadonlyMap<string, string>,
  collections: ReadonlyMap<string, string>,
  modeIds: ReadonlyMap<string, string> = new Map(),
  styleIds: ReadonlyMap<string, string> = new Map(),
  droppedModes: ReadonlySet<string> = new Set()
): void {
  node.boundVariables = Object.fromEntries(
    Object.entries(node.boundVariables).map(([field, id]) => [field, variables.get(id) ?? id])
  )
  node.variableModes = Object.fromEntries(
    Object.entries(node.variableModes).flatMap(([id, mode]) =>
      droppedModes.has(mode) ? [] : [[collections.get(id) ?? id, modeIds.get(mode) ?? mode]]
    )
  )
  for (const key of [
    'fillStyleId',
    'strokeStyleId',
    'textStyleId',
    'effectStyleId',
    'gridStyleId'
  ] as const) {
    const id = node[key]
    if (id && styleIds.has(id)) node[key] = styleIds.get(id) ?? id
  }
  node.styleRuns = remapStyleRunReferences(node.styleRuns, {
    variable: (id) => variables.get(id) ?? id,
    style: (id) => styleIds.get(id) ?? id
  })
}
