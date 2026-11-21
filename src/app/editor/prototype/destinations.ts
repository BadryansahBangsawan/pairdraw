import type { SceneGraph } from '@pairdraw/scene-graph'
import { variantSetsAround } from '@pairdraw/scene-graph/components'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'
import { parseVariantName } from '@pairdraw/scene-graph/variant-name'

/** A destination the panel lists: the layer's id and the name it shows. */
export interface DestinationOption {
  value: string
  label: string
}

/**
 * The variants a Change to on this layer can show, as the panel lists them: the variants of each
 * set the layer belongs to, nearest set first, named by the one value that tells them apart, by
 * the whole variant name when a set has several properties, and after their set when there is
 * more than one.
 */
export function variantDestinations(graph: SceneGraph, nodeId: string): DestinationOption[] {
  const sets = variantSetsAround(graph, nodeId)
  return sets.flatMap((set) =>
    graph
      .getChildren(set.id)
      .filter((variant) => variant.type === 'COMPONENT')
      .map((variant) => {
        const values = Object.values(parseVariantName(variant.name))
        const name = values.length === 1 ? (values[0] ?? variant.name) : variant.name
        return { value: variant.id, label: sets.length > 1 ? `${set.name}: ${name}` : name }
      })
  )
}

/**
 * How many interactions an instance runs from its main component: those whose trigger none of
 * its own reactions takes over. A layer that is no instance inherits none.
 */
export function inheritedReactionCount(graph: SceneGraph, nodeId: string): number {
  const node = graph.getNode(nodeId)
  if (node?.type !== 'INSTANCE') return 0
  const own = new Set(node.prototypeReactions.map((reaction) => reaction.trigger.type))
  const inherited = instanceMainComponent(graph, node)?.prototypeReactions ?? []
  return inherited.filter((reaction) => !own.has(reaction.trigger.type)).length
}
