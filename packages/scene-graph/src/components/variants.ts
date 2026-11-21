import type { SceneGraph } from '../graph'
import { instanceMainComponent } from '../instances/main-component'
import type { SceneNode } from '../types'

/** Variants in reading order on the canvas: top to bottom, then left to right, then by name. */
export function compareCanvasPosition(a: SceneNode, b: SceneNode): number {
  return a.y - b.y || a.x - b.x || a.name.localeCompare(b.name)
}

/**
 * A component set's default variant, the one an instance starts as: the variant in its
 * top-left corner, as Figma defines it.
 */
export function defaultVariant(graph: SceneGraph, set: SceneNode): SceneNode | undefined {
  return graph
    .getChildren(set.id)
    .filter((child) => child.type === 'COMPONENT')
    .sort(compareCanvasPosition)[0]
}

/**
 * The value a variant property starts at: its recorded default when that is one of its options,
 * or else the default variant's, since a document may leave the recorded default empty.
 */
export function variantDefaultValue(
  graph: SceneGraph,
  set: SceneNode,
  property: { name: string; defaultValue: string; variantOptions?: string[] }
): string {
  if (property.variantOptions?.includes(property.defaultValue)) return property.defaultValue
  return defaultVariant(graph, set)?.componentPropertyValues[property.name] ?? property.defaultValue
}

/**
 * The variant with every property at its default value: the recorded defaults when they name a
 * variant, else the default variant, as a document that leaves them out draws it.
 */
export function restingVariant(graph: SceneGraph, set: SceneNode): SceneNode | undefined {
  const properties = set.componentPropertyDefinitions.filter(
    (definition) => definition.type === 'VARIANT'
  )
  const values = properties.map(
    (property) => [property.name, variantDefaultValue(graph, set, property)] as const
  )
  return (
    graph
      .getChildren(set.id)
      .find(
        (child) =>
          child.type === 'COMPONENT' &&
          values.every(([name, value]) => child.componentPropertyValues[name] === value)
      ) ?? defaultVariant(graph, set)
  )
}

/** The component set a variant belongs to, or the set of the variant an instance shows. */
function variantSetOf(graph: SceneGraph, node: SceneNode): SceneNode | undefined {
  const variant = node.type === 'INSTANCE' ? instanceMainComponent(graph, node) : node
  if (variant?.type !== 'COMPONENT' || !variant.parentId) return undefined
  const set = graph.getNode(variant.parentId)
  return set?.type === 'COMPONENT_SET' ? set : undefined
}

/**
 * The component sets whose variants a prototype's Change to on this layer may show, nearest
 * first: the set of each variant, and of each instance of a variant, from the layer up.
 */
export function variantSetsAround(graph: SceneGraph, nodeId: string): SceneNode[] {
  const sets: SceneNode[] = []
  graph.closest(nodeId, (node) => {
    const set = variantSetOf(graph, node)
    if (set && !sets.includes(set)) sets.push(set)
    return false
  })
  return sets
}

/**
 * The instance a Change to from this layer switches to another variant of `setId`: the layer
 * itself or its nearest instance ancestor that shows a variant of that set. A main component has
 * none, since it is the definition rather than a copy that changes.
 */
export function variantInstanceFor(
  graph: SceneGraph,
  nodeId: string,
  setId: string
): SceneNode | undefined {
  return graph.closest(
    nodeId,
    (node) => node.type === 'INSTANCE' && variantSetOf(graph, node)?.id === setId
  )
}
