// Layers an instance shows in place of its component's layers ("replaced layers").
import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'
import { copiedComponentLayerId, REPLACED_LAYER_OVERRIDE } from './overrides'

/** The nearest instance strictly above a layer, which records the layer's overrides. */
export function owningInstance(graph: SceneGraph, node: SceneNode): SceneNode | undefined {
  return node.parentId ? graph.closest(node.parentId, (n) => n.type === 'INSTANCE') : undefined
}

/** The component layer a layer of `owner` stands in for, as `owner` recorded it. */
export function replacedLayerIn(owner: SceneNode | undefined, nodeId: string): string | undefined {
  const value = owner?.instanceOverrides.descendants.get(nodeId)?.get(REPLACED_LAYER_OVERRIDE)
  return typeof value === 'string' ? value : undefined
}

/** The component layer this layer stands in for, when an instance put it in that layer's place. */
export function replacedComponentLayerId(graph: SceneGraph, node: SceneNode): string | undefined {
  return replacedLayerIn(owningInstance(graph, node), node.id)
}

export function isReplacedLayer(graph: SceneGraph, node: SceneNode): boolean {
  return replacedComponentLayerId(graph, node) !== undefined
}

/**
 * Whether the layer is a replaced layer or a copy of one: the instances of a component copy a
 * replaced layer of an instance inside it as they copy its other layers. Neither stands for a
 * layer of the component the instance shows, so neither has an address in it.
 */
export function showsReplacedLayer(graph: SceneGraph, node: SceneNode): boolean {
  const seen = new Set<string>()
  let current: SceneNode | undefined = node
  while (current && !seen.has(current.id)) {
    if (isReplacedLayer(graph, current)) return true
    seen.add(current.id)
    const owner = owningInstance(graph, current)
    const source: string | undefined =
      owner && copiedComponentLayerId(owner.instanceOverrides, owner.id, current)
    current = source ? graph.nodes.get(source) : undefined
  }
  return false
}

/** Whether the layer shows a replaced layer, as `showsReplacedLayer` says, or sits inside one. */
export function isInShownReplacedLayer(graph: SceneGraph, nodeId: string): boolean {
  return graph.closest(nodeId, (node) => showsReplacedLayer(graph, node)) !== undefined
}

/**
 * A layer and the layers it copies in turn, up to the definition: a copy in a nested instance
 * names the copy in its enclosing component, which names the nested component's own layer. An
 * instance links to its component, which is not a layer it copies.
 */
function copiedLayers(graph: SceneGraph, id: string): string[] {
  const ids: string[] = []
  let current = graph.nodes.get(id)
  while (current && !ids.includes(current.id)) {
    ids.push(current.id)
    const next = current.componentId ? graph.nodes.get(current.componentId) : undefined
    current = next?.type === 'COMPONENT' ? undefined : next
  }
  return ids
}

/**
 * Which of `layerIds`, the layers of the component being synced, the replaced layer `replaced`
 * stands in for. It is recorded as its instance saw it, and a sync may run from an enclosing
 * component or from the nested one, so either may copy the other.
 */
export function replacedLayerMatch(
  graph: SceneGraph,
  replaced: string,
  layerIds: readonly string[]
): string | undefined {
  const chain = copiedLayers(graph, replaced)
  return layerIds.find(
    (layerId) => chain.includes(layerId) || copiedLayers(graph, layerId).includes(replaced)
  )
}
