import type {
  SceneGraph,
  SceneNode,
  SharedStyleType,
  VariableCollection
} from '@open-pencil/scene-graph'

import { defaultTokenImportOptions } from '#core/io/formats/design-tokens/plan'
import type { DesignTokenBundle } from '#core/io/formats/design-tokens/read'

import type { ClipboardSnapshot } from './snapshot'

/** What a copied collection or style does when this document has one of the same name. */
export type ClipboardConflictResolution = 'use-existing' | 'add-renamed'

/** A same-named collection or style of the document pasted into. */
export type ClipboardExistingDependency = Pick<VariableCollection, 'id' | 'name'>

export interface ClipboardCollectionDependency {
  /** The collection's id in the document it was copied from. */
  id: string
  name: string
  variableCount: number
  /** The collection of this document it matches by name, which "Use existing" binds to. */
  existing: ClipboardExistingDependency | null
}

export interface ClipboardStyleDependency {
  /** The style's id in the document it was copied from. */
  id: string
  name: string
  type: SharedStyleType
  existing: ClipboardExistingDependency | null
}

/** The variables and styles a copy from another document brings, and which of them clash. */
export interface ClipboardImportPlan {
  collections: ClipboardCollectionDependency[]
  styles: ClipboardStyleDependency[]
}

/** How a paste from another document treats the variables and styles its layers use. */
export interface ClipboardImportChoice {
  /**
   * `import` brings the variables and styles along; `as-is` pastes the layers with the values
   * they showed when copied, linked to nothing.
   */
  mode: 'import' | 'as-is'
  /** By source collection or style id; a conflict without a choice uses the existing one. */
  resolutions?: Readonly<Record<string, ClipboardConflictResolution>>
}

/** Where a copied collection merges into this document, with its modes matched by name. */
export interface ClipboardCollectionMerge {
  collectionId: string
  /** Source mode id to this document's mode id; a mode without a match is dropped. */
  modes: Map<string, string>
}

/** Whether a choice keeps a conflicting collection or style apart under a new name. */
export function addsRenamed(choice: ClipboardImportChoice | undefined, sourceId: string): boolean {
  return choice?.resolutions?.[sourceId] === 'add-renamed'
}

/**
 * Copied collections matched to this document's by name, with their modes, as the design-token
 * import matches them: library collections are left alone, and each match is used once.
 */
export function matchClipboardCollections(
  graph: SceneGraph,
  collections: readonly VariableCollection[]
): Map<string, ClipboardCollectionMerge> {
  const bundle: DesignTokenBundle = {
    collections: collections.map((collection) => ({
      name: collection.name,
      modeAttribute: undefined,
      modes: collection.modes.map((mode) => ({
        name: mode.name,
        tokens: [],
        isDefault: mode.modeId === collection.defaultModeId,
        condition: undefined
      }))
    })),
    composites: [],
    issues: []
  }
  const matches = new Map<string, ClipboardCollectionMerge>()
  defaultTokenImportOptions(graph, bundle).collections.forEach((choice, index) => {
    const source = collections[index]
    if (choice.target.kind !== 'existing') return
    const modes = new Map<string, string>()
    choice.modes.forEach((mode, modeIndex) => {
      const sourceMode = source.modes.at(modeIndex)
      if (mode.kind === 'existing' && sourceMode) modes.set(sourceMode.modeId, mode.modeId)
    })
    matches.set(source.id, { collectionId: choice.target.collectionId, modes })
  })
  return matches
}

/** Copied style definitions matched to this document's styles of the same name and type. */
export function matchClipboardStyles(
  graph: SceneGraph,
  definitions: readonly SceneNode[]
): Map<string, SceneNode> {
  const existing = [...graph.getAllNodes()].filter(
    (node) => node.sharedStyleType !== null && node.source.id
  )
  const claimed = new Set<string>()
  const matches = new Map<string, SceneNode>()
  for (const definition of definitions) {
    const sourceId = definition.source.id
    if (!sourceId || !definition.sharedStyleType) continue
    const match = existing.find(
      (node) =>
        node.name === definition.name &&
        node.sharedStyleType === definition.sharedStyleType &&
        !claimed.has(node.id)
    )
    if (!match) continue
    claimed.add(match.id)
    matches.set(sourceId, match)
  }
  return matches
}

/**
 * What a paste of the snapshot would bring into this document: nothing for a copy from this
 * document, which uses its own variables and styles.
 */
export function planClipboardImport(
  graph: SceneGraph,
  snapshot: ClipboardSnapshot
): ClipboardImportPlan {
  if (snapshot.sourceRootId === graph.rootId) return { collections: [], styles: [] }
  const { collections, variables } = snapshot.variableDependencies
  const collectionMatches = matchClipboardCollections(graph, collections)
  const styleMatches = matchClipboardStyles(graph, snapshot.styleDefinitions)
  const existingCollection = (id: string): ClipboardExistingDependency | null => {
    const match = collectionMatches.get(id)
    const collection = match ? graph.variableCollections.get(match.collectionId) : undefined
    return collection ? { id: collection.id, name: collection.name } : null
  }
  return {
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      variableCount: variables.filter((variable) => variable.collectionId === collection.id).length,
      existing: existingCollection(collection.id)
    })),
    styles: snapshot.styleDefinitions.flatMap((definition) => {
      const sourceId = definition.source.id
      if (!sourceId || !definition.sharedStyleType) return []
      const match = styleMatches.get(sourceId)
      return [
        {
          id: sourceId,
          name: definition.name,
          type: definition.sharedStyleType,
          existing: match?.source.id ? { id: match.source.id, name: match.name } : null
        }
      ]
    })
  }
}

/** Whether a paste has variables or styles to ask about. */
export function clipboardImportHasDependencies(plan: ClipboardImportPlan): boolean {
  return plan.collections.length > 0 || plan.styles.length > 0
}

/** Whether any copied collection or style clashes with one of this document. */
export function clipboardImportHasConflicts(plan: ClipboardImportPlan): boolean {
  return [...plan.collections, ...plan.styles].some((dependency) => dependency.existing !== null)
}
