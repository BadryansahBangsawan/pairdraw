import type { SceneNode } from '@pairdraw/scene-graph'
import { numberedName } from '@pairdraw/scene-graph/naming'

import type { EditorContext } from '#core/editor/types'

import {
  addsRenamed,
  matchClipboardCollections,
  matchClipboardStyles,
  type ClipboardCollectionMerge,
  type ClipboardImportChoice
} from './conflicts'
import { detachClipboardNode } from './detach'
import { applyExistingStyles } from './existing-styles'
import type { ClipboardNodeTree, ClipboardSnapshot } from './snapshot'
import { importClipboardVariables, remapClipboardVariableBindings } from './variables'

export interface ClipboardDependencyImport {
  nodes: ClipboardSnapshot['nodes']
  componentDependencies: ClipboardSnapshot['componentDependencies']
  styleSnapshots: SceneNode[]
  /**
   * Whether the layers bind variables of this document now, whose values may differ from the
   * copied ones, so the paste resolves their bindings once they are placed.
   */
  resolveBindings: boolean
  applyVariables?: () => void
  revertVariables?: () => void
}

/** Imports a snapshot's styles and variables as undo steps of the running batch. */
export function importClipboardDependenciesWithUndo(
  ctx: EditorContext,
  snapshot: ClipboardSnapshot,
  choice?: ClipboardImportChoice
): ClipboardDependencyImport {
  const dependencies = importClipboardDependencies(ctx, snapshot, choice)
  if (dependencies.styleSnapshots.length > 0) {
    ctx.undo.push({
      label: 'Import clipboard styles',
      forward: () => {
        for (const style of dependencies.styleSnapshots) {
          ctx.graph.preserveSourceMetadataDuring(() =>
            ctx.graph.createNode(style.type, ctx.state.currentPageId, style)
          )
        }
      },
      inverse: () => {
        for (const style of dependencies.styleSnapshots) ctx.graph.deleteNode(style.id)
      }
    })
  }
  if (dependencies.applyVariables && dependencies.revertVariables) {
    ctx.undo.push({
      label: 'Import clipboard variables',
      forward: dependencies.applyVariables,
      inverse: dependencies.revertVariables
    })
  }
  return dependencies
}

/**
 * The snapshot's layers ready to paste here. A copy from another document brings its styles and
 * variables, or with an `as-is` choice keeps only the values its layers showed. Without a choice
 * every collection and style is added; with one, a same-named collection or style is used
 * unless the choice adds it renamed.
 */
export function importClipboardDependencies(
  ctx: EditorContext,
  snapshot: ClipboardSnapshot,
  choice?: ClipboardImportChoice
): ClipboardDependencyImport {
  const nodes = structuredClone(snapshot.nodes)
  const componentDependencies = structuredClone(snapshot.componentDependencies)
  if (snapshot.sourceRootId === ctx.graph.rootId) {
    return {
      nodes,
      componentDependencies: componentDependencies.filter((node) => !ctx.graph.getNode(node.id)),
      styleSnapshots: [],
      resolveBindings: false
    }
  }
  if (choice?.mode === 'as-is') {
    const detach = (node: ClipboardNodeTree) => {
      detachClipboardNode(node, snapshot.resolvedBindings?.get(node.id))
      for (const child of node.children ?? []) detach(child)
    }
    for (const node of [...nodes, ...componentDependencies]) detach(node)
    return { nodes, componentDependencies, styleSnapshots: [], resolveBindings: false }
  }
  const styleIds = new Map<string, string>()
  /** This document's styles the layers use in place of copied ones, by id. */
  const existingStyles = new Map<string, SceneNode>()
  const styleSnapshots: SceneNode[] = []
  const styleMatches = choice ? matchClipboardStyles(ctx.graph, snapshot.styleDefinitions) : null
  const takenStyleNames = [...ctx.graph.getAllNodes()].flatMap((node) =>
    node.sharedStyleType ? [node.name] : []
  )
  for (const definition of snapshot.styleDefinitions) {
    const sourceStyleId = definition.source.id
    if (!sourceStyleId) continue
    const match = styleMatches?.get(sourceStyleId)
    const renamed = addsRenamed(choice, sourceStyleId)
    if (match?.source.id && !renamed) {
      styleIds.set(sourceStyleId, match.source.id)
      existingStyles.set(match.source.id, match)
      continue
    }
    const pastedStyleId = crypto.randomUUID()
    const name = renamed ? numberedName(definition.name, takenStyleNames) : definition.name
    takenStyleNames.push(name)
    let pasted: SceneNode | undefined
    ctx.graph.preserveSourceMetadataDuring(() => {
      pasted = ctx.graph.createNode(definition.type, ctx.state.currentPageId, {
        ...structuredClone(definition),
        id: undefined,
        name,
        parentId: ctx.state.currentPageId,
        childIds: [],
        source: { ...definition.source, id: pastedStyleId }
      })
    })
    if (!pasted) continue
    styleIds.set(sourceStyleId, pastedStyleId)
    styleSnapshots.push(structuredClone(pasted))
  }
  const collections = snapshot.variableDependencies.collections
  const merges = choice
    ? matchClipboardCollections(ctx.graph, collections)
    : new Map<string, ClipboardCollectionMerge>()
  for (const collection of collections)
    if (addsRenamed(choice, collection.id)) merges.delete(collection.id)
  const variables = importClipboardVariables(
    ctx.graph,
    snapshot.variableDependencies,
    merges,
    new Set(collections.flatMap(({ id }) => (addsRenamed(choice, id) ? [id] : [])))
  )
  function remap(node: ClipboardSnapshot['nodes'][number]) {
    remapClipboardVariableBindings(
      node,
      variables.variableIds,
      variables.collectionIds,
      variables.modeIds,
      styleIds,
      variables.droppedModes
    )
    applyExistingStyles(ctx.graph, node, existingStyles)
    for (const child of node.children ?? []) remap(child)
  }
  for (const node of [...nodes, ...componentDependencies]) remap(node)
  variables.apply()
  return {
    nodes,
    componentDependencies,
    styleSnapshots,
    resolveBindings: snapshot.variableDependencies.variables.length > 0,
    applyVariables: variables.apply,
    revertVariables: variables.revert
  }
}
