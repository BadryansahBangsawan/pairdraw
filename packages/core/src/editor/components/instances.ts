import type { SceneNode } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds, getWorldMatrix } from '@pairdraw/scene-graph/coordinate'
import { canCreateInstance } from '@pairdraw/scene-graph/instances'
import {
  cloneInstanceOverrideState,
  type InstanceOverrideState
} from '@pairdraw/scene-graph/instances/overrides'
import Matrix from '@pairdraw/scene-graph/matrix'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import { getNodeEditCapability } from '#core/editor/capabilities'
import { prepareSlotEdits } from '#core/editor/components/slots'
import { recordSubtreeEdit } from '#core/editor/components/slots/history'
import { recordEdit } from '#core/editor/history/edit'
import { restoreSubtree, snapshotSubtree } from '#core/editor/history/subtree'
import type { EditorContext } from '#core/editor/types'
import {
  canPushInstanceOverrides as canPushInstanceOverridesInGraph,
  instanceOverrides,
  pushInstanceOverrides as pushInstanceOverridesInGraph,
  resetInstanceOverrides as resetInstanceOverridesInGraph
} from '#core/figma-api/overrides'

/**
 * The overrides of the instances an instance holds, down to the first instance on each branch:
 * the ones detaching it hands their layers' overrides to.
 */
function nestedInstanceOverrides(
  ctx: EditorContext,
  instanceId: string
): Map<string, InstanceOverrideState> {
  const states = new Map<string, InstanceOverrideState>()
  const visit = (parentId: string): void => {
    for (const child of ctx.graph.getChildren(parentId)) {
      if (child.type === 'INSTANCE')
        states.set(child.id, cloneInstanceOverrideState(child.instanceOverrides))
      else visit(child.id)
    }
  }
  visit(instanceId)
  return states
}
type DefaultInstancePlacement = {
  local: Vector
  world: Vector
}

function defaultInstancePlacement(
  ctx: EditorContext,
  component: SceneNode,
  parentId: string
): DefaultInstancePlacement {
  const bounds = getAxisAlignedWorldBounds(component, ctx.graph)
  const world = { x: bounds.x + bounds.width + 40, y: bounds.y }
  const parent = ctx.graph.getNode(parentId)
  if (!parent) return { local: world, world }
  const inverse = Matrix.invert(getWorldMatrix(parent, ctx.graph))
  return { local: inverse ? Matrix.mapPoint(inverse, world) : world, world }
}

function alignInstanceWorldBounds(
  ctx: EditorContext,
  instance: SceneNode,
  parentId: string,
  target: Vector
): void {
  const bounds = getAxisAlignedWorldBounds(instance, ctx.graph)
  const worldDelta = { x: target.x - bounds.x, y: target.y - bounds.y }
  const parent = ctx.graph.getNode(parentId)
  const inverse = parent ? Matrix.invert(getWorldMatrix(parent, ctx.graph)) : null
  if (!inverse) {
    ctx.graph.updateNode(instance.id, {
      x: instance.x + worldDelta.x,
      y: instance.y + worldDelta.y
    })
    return
  }
  const origin = Matrix.mapPoint(inverse, { x: 0, y: 0 })
  const delta = Matrix.mapPoint(inverse, worldDelta)
  ctx.graph.updateNode(instance.id, {
    x: instance.x + delta.x - origin.x,
    y: instance.y + delta.y - origin.y
  })
}

export function createComponentInstanceActions(ctx: EditorContext) {
  function createInstance(
    componentId: string,
    x?: number,
    y?: number,
    parentId = ctx.state.currentPageId
  ) {
    const component = ctx.graph.getNode(componentId)
    if (component?.type !== 'COMPONENT') return null
    if (!canCreateInstance(ctx.graph, componentId, parentId)) return null
    if (!prepareSlotEdits(ctx, [parentId])) return null

    const previousSelection = new Set(ctx.state.selectedIds)
    const defaultPlacement = defaultInstancePlacement(ctx, component, parentId)
    const instance = ctx.graph.createInstance(componentId, parentId, {
      x: x ?? defaultPlacement.local.x,
      y: y ?? defaultPlacement.local.y
    })
    if (!instance) return null
    if (x === undefined && y === undefined) {
      alignInstanceWorldBounds(ctx, instance, parentId, defaultPlacement.world)
    }

    const instanceId = instance.id
    ctx.setSelectedIds(new Set([instanceId]))
    // Redo restores the layers the instance had, ids included, so overrides and links it took
    // keep their targets; creating an instance again would make new ones.
    const subtree = snapshotSubtree(ctx.graph, instanceId)

    ctx.undo.push({
      label: 'Create instance',
      forward: () => {
        if (!ctx.graph.getNode(instanceId)) {
          const root = subtree.get(instanceId)
          if (root) restoreSubtree(ctx.graph, root, parentId, subtree)
        }
        ctx.setSelectedIds(new Set([instanceId]))
      },
      inverse: () => {
        ctx.graph.deleteNode(instanceId)
        ctx.setSelectedIds(new Set(previousSelection))
      }
    })
    return instanceId
  }

  /** Place an instance of a component; claiming a slot it lands in is part of the same undo step. */
  function createInstanceFromComponent(
    componentId: string,
    x?: number,
    y?: number,
    parentId = ctx.state.currentPageId
  ) {
    return ctx.undo.runBatch('Create instance', () => createInstance(componentId, x, y, parentId))
  }

  function detachInstance(selectedNode: SceneNode | undefined) {
    if (selectedNode?.type !== 'INSTANCE') return

    const prevComponentId = selectedNode.componentId
    const previousOverrides = cloneInstanceOverrideState(selectedNode.instanceOverrides)
    const previousNestedOverrides = nestedInstanceOverrides(ctx, selectedNode.id)

    ctx.graph.detachInstance(selectedNode.id)
    ctx.setSelectedIds(new Set([selectedNode.id]))

    ctx.undo.push({
      label: 'Detach instance',
      forward: () => {
        ctx.graph.detachInstance(selectedNode.id)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(selectedNode.id, {
          type: 'INSTANCE',
          componentId: prevComponentId,
          instanceOverrides: cloneInstanceOverrideState(previousOverrides)
        })
        // Detaching gave the instances it holds their layers' overrides; undoing takes them back.
        for (const [id, overrides] of previousNestedOverrides)
          ctx.graph.updateNode(id, { instanceOverrides: cloneInstanceOverrideState(overrides) })
      }
    })
  }

  /** Whether `id` is an instance holding any edit of its own, so Reset all changes has work. */
  function instanceHasOverrides(id: string): boolean {
    const node = ctx.graph.getNode(id)
    return node?.type === 'INSTANCE' && instanceOverrides(ctx.graph, node).length > 0
  }

  /** Figma's Reset all changes: the instance and the ones inside it go back to their components. */
  function resetInstanceOverridesFromSelection(id: string): void {
    const node = ctx.graph.getNode(id)
    if (node?.type !== 'INSTANCE') return
    recordSubtreeEdit(ctx, 'Reset all changes', id, () =>
      resetInstanceOverridesInGraph(ctx.graph, node)
    )
  }

  /** Whether a library owns the main component, whose changes only its library can take. */
  function mainComponentEditable(componentId: string): boolean {
    return getNodeEditCapability(ctx.graph, componentId).editable
  }

  /**
   * Figma's Push changes to main component: the instance's edits move to its main component,
   * and the instance follows them. A library's main component cannot take them.
   */
  function canPushInstanceOverrides(id: string): boolean {
    const node = ctx.graph.getNode(id)
    return (
      node?.type === 'INSTANCE' &&
      canPushInstanceOverridesInGraph(ctx.graph, node, mainComponentEditable)
    )
  }

  function pushInstanceOverridesFromSelection(id: string): boolean {
    const node = ctx.graph.getNode(id)
    if (node?.type !== 'INSTANCE' || !canPushInstanceOverrides(id)) return false
    return recordEdit(ctx, { label: 'Push changes to main component' }, () =>
      pushInstanceOverridesInGraph(ctx.graph, node, mainComponentEditable)
    )
  }

  return {
    createInstanceFromComponent,
    detachInstance,
    instanceHasOverrides,
    canPushInstanceOverrides,
    pushInstanceOverrides: pushInstanceOverridesFromSelection,
    resetInstanceOverrides: resetInstanceOverridesFromSelection
  }
}
