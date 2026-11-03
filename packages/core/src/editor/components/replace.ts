import { compact } from 'es-toolkit/array'

import {
  canCreateInstance,
  canReplaceInstanceLayer,
  isReplacedLayer,
  replaceInstanceLayer,
  restoreReplacedLayer
} from '@open-pencil/scene-graph/instances'

import { assertNodeEditable, getNodeEditCapability } from '#core/editor/capabilities'
import { recordEdit } from '#core/editor/history/edit'
import type { EditorContext } from '#core/editor/types'

import { reapplyInstanceComponentProperties } from './properties'

/**
 * The layers among `ids` that can be replaced inside their instance: copies of a component's
 * layers, or replaced layers, that are unlocked and not part of a library's component.
 */
export function replaceableInstanceLayers(
  ctx: Pick<EditorContext, 'graph'>,
  ids: Iterable<string>
): string[] {
  return [...ids].filter((id) => {
    const node = ctx.graph.getNode(id)
    return (
      !!node &&
      !node.locked &&
      canReplaceInstanceLayer(ctx.graph, id) &&
      getNodeEditCapability(ctx.graph, id).editable
    )
  })
}

/**
 * Replace each target inside its instance with the first of `layerIds`, as pen.dev's Replace
 * inside instance does: the first target takes that layer and every other target a copy of it.
 * One undo step, which joins a paste open around it. Returns the layers put in place, which it
 * selects; the other `layerIds` stay where they are.
 */
export function replaceInstanceLayersWith(
  ctx: EditorContext,
  targetIds: readonly string[],
  layerIds: readonly string[]
): string[] {
  const replacementId = layerIds[0]
  const targets = replaceableInstanceLayers(ctx, targetIds)
  if (!replacementId || targets.length === 0) return []
  for (const id of targets) assertNodeEditable(ctx.graph, id)
  const placed = recordEdit(ctx, { label: 'Replace in instance' }, () => {
    const parentId = ctx.graph.getNode(replacementId)?.parentId
    if (!parentId) return []
    // Copies first, while the replacement is still where it was put.
    const replacements = targets.map((_, index) =>
      index === 0 ? replacementId : ctx.graph.cloneTree(replacementId, parentId)?.id
    )
    return compact(
      targets.map((targetId, index) => {
        const id = replacements[index]
        const targetParentId = ctx.graph.getNode(targetId)?.parentId
        if (!id) return null
        if (!replaceInstanceLayer(ctx.graph, targetId, id)) {
          if (index > 0) ctx.graph.deleteNode(id)
          return null
        }
        if (targetParentId) ctx.runLayoutForNode(targetParentId)
        return id
      })
    )
  })
  if (placed.length > 0) ctx.setSelectedIds(new Set(placed))
  ctx.requestRender()
  return placed
}

export function createInstanceReplaceActions(ctx: EditorContext) {
  /** Take a replaced layer out and bring back the component's layer, as one undo step. */
  function restoreReplacedInstanceLayer(nodeId: string): boolean {
    const node = ctx.graph.getNode(nodeId)
    if (!node || !isReplacedLayer(ctx.graph, node)) return false
    assertNodeEditable(ctx.graph, nodeId)
    const parentId = node.parentId
    const restored = recordEdit(ctx, { label: 'Restore layer' }, () => {
      const done = restoreReplacedLayer(ctx.graph, nodeId)
      if (done && parentId) ctx.runLayoutForNode(parentId)
      return done
    })
    if (restored && parentId) ctx.setSelectedIds(new Set([parentId]))
    ctx.requestRender()
    return restored
  }

  /**
   * Show another component in an instance, a nested one included, as Figma's instance swap
   * does from the instance's header, without a property bound to it. One undo step.
   */
  function swapInstance(instanceId: string, componentId: string): boolean {
    const instance = ctx.graph.getNode(instanceId)
    const component = ctx.graph.getNode(componentId)
    if (instance?.type !== 'INSTANCE' || component?.type !== 'COMPONENT') return false
    if (instance.componentId === componentId) return false
    if (instance.parentId && !canCreateInstance(ctx.graph, componentId, instance.parentId))
      return false
    assertNodeEditable(ctx.graph, instanceId)
    recordEdit(ctx, { label: 'Swap instance' }, () => {
      ctx.graph.swapInstanceComponent(instanceId, componentId)
      reapplyInstanceComponentProperties(ctx, instanceId)
      ctx.runLayoutForNode(instanceId)
    })
    ctx.requestRender()
    return true
  }

  return {
    replaceableInstanceLayers: (ids: Iterable<string>) => replaceableInstanceLayers(ctx, ids),
    replaceInstanceLayersWith: (targetIds: readonly string[], layerIds: readonly string[]) =>
      replaceInstanceLayersWith(ctx, targetIds, layerIds),
    restoreReplacedInstanceLayer,
    swapInstance
  }
}
