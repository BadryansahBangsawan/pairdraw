import { pick } from 'es-toolkit'

import { MAIN_COMPONENT_FIELDS } from '../fields'
import type { SceneGraph } from '../graph'
import { createDefaultNode } from '../node-defaults'
import { readPluginData, withPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import type { SceneNode } from '../types'

/** `node`'s plugin data marking it as the stand-in for `mainId`, or unmarked for null. */
export function withStandIn(node: Pick<SceneNode, 'pluginData'>, mainId: string | null) {
  return withPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.variationStandIn, mainId ?? undefined)
}

/** What a copied main component or component set clears to become a plain frame. */
function plainFrameFields(): Partial<SceneNode> {
  const frame = createDefaultNode(() => '', 'FRAME')
  return { type: 'FRAME', ...pick(frame, MAIN_COMPONENT_FIELDS) }
}

/**
 * A copied main component inside the copy shows the component it copied, as an instance in its
 * place, so copies never add main components; one that cannot become an instance, such as one
 * that would hold itself, stays a plain frame.
 */
function instanceInPlace(graph: SceneGraph, component: SceneNode, copy: SceneNode, index: number) {
  const parentId = copy.parentId
  const instance = parentId
    ? graph.createInstance(component.id, parentId, { name: copy.name, x: copy.x, y: copy.y })
    : null
  if (!instance || !parentId) {
    graph.updateNode(copy.id, plainFrameFields())
    return
  }
  graph.updateNode(instance.id, { pluginData: withStandIn(instance, component.id) })
  graph.insertChildAt(instance.id, parentId, index)
  graph.deleteNode(copy.id)
}

/**
 * Copies `source` under `parentId` as a version: its root is never a main component or a
 * component set (it becomes a plain frame), and the main components inside it are instances of
 * the components they copy. Instances stay instances. Each layer standing in for a main
 * component or set is marked with its id (`variationStandIn`), which is how a pick knows it. Right after a copy the two trees have the
 * same shape, so each copied layer is found at its source's place.
 */
export function copyVersion(
  graph: SceneGraph,
  sourceId: string,
  parentId: string,
  overrides: Partial<SceneNode>
): SceneNode | null {
  const copy = graph.cloneTree(sourceId, parentId, overrides)
  if (!copy) return null
  if (copy.type === 'COMPONENT' || copy.type === 'COMPONENT_SET') {
    graph.updateNode(copy.id, plainFrameFields())
  }
  const pending: Array<[string, string]> = [[sourceId, copy.id]]
  // Pairs are appended while the list is walked, parents before their children.
  for (const [fromId, toId] of pending) {
    const from = graph.getNode(fromId)
    const to = graph.getNode(toId)
    // An instance's layers are its component's copies, kept by sync.
    if (!from || !to || from.type === 'INSTANCE') continue
    const copied = [...to.childIds]
    from.childIds.forEach((childId, index) => {
      const child = graph.getNode(childId)
      const childCopy = graph.getNode(copied[index] ?? '')
      if (!child || !childCopy) return
      // Copying a version copies its stand-ins as stand-ins, which a plain copy drops.
      const mark = readPluginData(child.pluginData, PAIRDRAW_PLUGIN_DATA.variationStandIn)
      if (mark !== undefined) {
        graph.updateNode(childCopy.id, { pluginData: withStandIn(childCopy, mark) })
      }
      if (child.type === 'COMPONENT') {
        instanceInPlace(graph, child, childCopy, index)
        return
      }
      if (child.type === 'COMPONENT_SET') {
        graph.updateNode(childCopy.id, {
          ...plainFrameFields(),
          pluginData: withStandIn(childCopy, child.id)
        })
      }
      pending.push([childId, childCopy.id])
    })
  }
  return graph.getNode(copy.id) ?? null
}
