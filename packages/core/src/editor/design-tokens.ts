import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  readTokenSources,
  tokenSourcesPluginData,
  type TokenSource
} from '@pairdraw/scene-graph/token-sources'

// Not the format's barrel: the editor always loads this file, and the exporter is loaded on demand.
import {
  applyTokenImport,
  styleNodeProps,
  styleNodeType,
  type TokenImportResult,
  type TokenImportTarget
} from '#core/io/formats/design-tokens/apply'
import type { TokenImportPlan } from '#core/io/formats/design-tokens/plan'

import type { NodeActions } from './nodes'
import type { EditorContext } from './types'
import type { createVariableActions } from './variables'

type VariableActions = ReturnType<typeof createVariableActions>
export function createDesignTokenActions(
  ctx: EditorContext,
  variables: VariableActions,
  nodes: NodeActions
) {
  /** A new style node, which redo makes again with the same ids so layers stay attached. */
  function addStyle(
    style: Parameters<TokenImportTarget['addStyle']>[0],
    fields: Partial<SceneNode>
  ) {
    const node = ctx.graph.createNode(
      styleNodeType(style),
      ctx.state.currentPageId,
      styleNodeProps(style, fields)
    )
    node.source.id = crypto.randomUUID()
    const snapshot = structuredClone(node)
    const parentId = node.parentId
    ctx.undo.push({
      label: 'Add style',
      forward: () => {
        ctx.graph.createNodeWithId(snapshot.id, snapshot.type, parentId, structuredClone(snapshot))
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.deleteNode(snapshot.id)
        ctx.requestRender()
      }
    })
    return node
  }

  /** The import's changes made through the editor's actions, each one undoable. */
  const target: Omit<TokenImportTarget, 'graph'> = {
    addCollection: (name) => {
      const collection = ctx.graph.createCollection(name)
      variables.addCollection(collection)
      return collection
    },
    addMode: (collectionId, name) => variables.addMode(collectionId, name),
    renameMode: (collectionId, modeId, name) => variables.renameMode(collectionId, modeId, name),
    setDefaultMode: (collectionId, modeId) => variables.setDefaultMode(collectionId, modeId),
    setModeCondition: (collectionId, modeId, condition) =>
      variables.setModeCondition(collectionId, modeId, condition),
    setModeAttribute: (collectionId, name) => variables.setModeAttribute(collectionId, name),
    addVariable: (planned, collectionId) => {
      const variable = ctx.graph.createVariable(planned.name, planned.type, collectionId)
      variables.addVariable(variable)
      return variable
    },
    setValue: (variableId, modeId, value) =>
      variables.updateVariableValue(variableId, modeId, value),
    setTokenFields: (variableId, fields) => variables.updateVariableToken(variableId, fields),
    addStyle,
    updateNode: (nodeId, changes) => nodes.updateNodeWithUndo(nodeId, changes, 'Update style'),
    bindVariable: (nodeId, field, variableId) => nodes.bindVariable(nodeId, field, variableId)
  }

  /** Applies an import plan as one undo step; nothing is deleted. */
  function importDesignTokens(plan: TokenImportPlan): TokenImportResult {
    return ctx.undo.runBatch('Import design tokens', () => {
      const result = applyTokenImport({ ...target, graph: ctx.graph }, plan)
      ctx.requestRender()
      return result
    })
  }

  /**
   * Brings linked code in as one undo step: the imports in order, then the document's links as
   * `sources` gives them once the imports are applied, so undo takes back both.
   */
  function syncDesignTokens(
    plans: readonly TokenImportPlan[],
    sources: (graph: SceneGraph) => TokenSource[]
  ): TokenImportResult[] {
    return ctx.undo.runBatch('Sync design tokens', () => {
      const results = plans.map((plan) => applyTokenImport({ ...target, graph: ctx.graph }, plan))
      writeTokenSources(sources(ctx.graph), 'Sync design tokens')
      ctx.requestRender()
      return results
    })
  }

  function writeTokenSources(sources: readonly TokenSource[], label: string) {
    nodes.updateNodeWithUndo(
      ctx.graph.rootId,
      { pluginData: tokenSourcesPluginData(ctx.graph, sources) },
      label
    )
  }

  /** Forgets a link to code; the variables it brought in stay. */
  function unlinkTokenSource(id: string) {
    const sources = readTokenSources(ctx.graph)
    if (!sources.some((source) => source.id === id)) return
    writeTokenSources(
      sources.filter((source) => source.id !== id),
      'Unlink code'
    )
  }

  return { importDesignTokens, syncDesignTokens, unlinkTokenSource }
}
