import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { removeComponentProperty } from '@open-pencil/scene-graph/components'

import { getNodeEditCapability } from '#core/editor/capabilities'
import { recordEdit } from '#core/editor/history/edit'
import type { EditorContext } from '#core/editor/types'

/**
 * Whether a main component can turn back into a frame: a variant belongs to its set and a
 * component copied from a library is that library's, so neither can.
 */
export function canConvertComponentToFrame(
  graph: SceneGraph,
  node: SceneNode | undefined
): node is SceneNode {
  if (node?.type !== 'COMPONENT') return false
  const parent = node.parentId ? graph.getNode(node.parentId) : undefined
  if (parent?.type === 'COMPONENT_SET') return false
  return getNodeEditCapability(graph, node.id).editable
}

/**
 * Every instance that converting the component would leave without a main component: its own
 * instances, and the copies those instances get inside instances of the components that hold
 * them, such as an icon component's instance inside a Button whose instances each copy it.
 */
function collectComponentInstances(graph: SceneGraph, componentId: string): SceneNode[] {
  const found = new Map<string, SceneNode>()
  const pending = [componentId]
  for (let mainId = pending.pop(); mainId !== undefined; mainId = pending.pop()) {
    for (const instance of graph.getInstances(mainId)) {
      if (found.has(instance.id)) continue
      found.set(instance.id, instance)
      pending.push(instance.id)
    }
  }
  return [...found.values()]
}

export function createComponentToFrameActions(ctx: EditorContext) {
  /** Whether the layer is a main component that can become a frame again. */
  function canConvertToFrame(componentId: string): boolean {
    return canConvertComponentToFrame(ctx.graph, ctx.graph.getNode(componentId))
  }

  /** The instances converting the component would detach, nested ones included. */
  function componentInstanceCount(componentId: string): number {
    return collectComponentInstances(ctx.graph, componentId).length
  }

  /**
   * Asks the front end to confirm turning a main component back into a frame, which it does with
   * `convertComponentToFrame`; nothing changes until then.
   */
  function requestComponentToFrame(componentId: string): void {
    if (!canConvertToFrame(componentId)) return
    ctx.emitEditorEvent('component:to-frame-requested', componentId)
  }

  /**
   * Turns a main component back into a frame in place, the reverse of creating it: the layer keeps
   * its id, children and look but drops its component properties and publishing, and every
   * instance of it, nested copies and other pages included, is detached into a frame that keeps
   * what it shows. One undo step restores the component and its instances.
   */
  function convertComponentToFrame(componentId: string): boolean {
    const component = ctx.graph.getNode(componentId)
    if (!canConvertComponentToFrame(ctx.graph, component)) return false
    recordEdit(ctx, { label: 'Convert to frame' }, () => {
      for (const instance of collectComponentInstances(ctx.graph, componentId)) {
        ctx.graph.detachInstance(instance.id)
      }
      // Clears the references its layers make to each property along with the definition.
      for (const definition of component.componentPropertyDefinitions) {
        removeComponentProperty(ctx.graph, componentId, definition.id)
      }
      ctx.graph.updateNode(componentId, {
        type: 'FRAME',
        componentPropertyDefinitions: [],
        componentKey: null,
        isPublishable: false,
        isSymbolPublishable: false
      })
    })
    ctx.setSelectedIds(new Set([componentId]))
    ctx.requestRender()
    return true
  }

  return {
    canConvertToFrame,
    componentInstanceCount,
    requestComponentToFrame,
    convertComponentToFrame
  }
}
