import type { SceneGraph } from '@pairdraw/scene-graph'
import { variantSetsAround } from '@pairdraw/scene-graph/components'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'
import { parseVariantName } from '@pairdraw/scene-graph/variant-name'
import type { AppSelectOption } from '@/components/ui/select/select'

/** A destination the panel lists: the layer's id and the name it shows. */
export type DestinationOption = Pick<AppSelectOption<string>, 'value' | 'label'>

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
  const inherited = instanceMainComponent(graph, node)?.prototypeReactions ?? []
  // Figma's copies keep the main's ids and run as the main's, so they replace nothing.
  const own = new Set(
    node.prototypeReactions
      .filter((reaction) => !inherited.some((main) => main.id === reaction.id))
      .map((reaction) => reaction.trigger.type)
  )
  return inherited.filter((reaction) => !own.has(reaction.trigger.type)).length
}

/** At most this many layers are offered to scroll to; a screen with more lists its first ones. */
const SCROLL_DESTINATION_LIMIT = 300

/**
 * The layers a Scroll to on this layer can bring into view: the visible layers inside the frames
 * that scroll on its screen, or every layer of a screen that scrolls itself, indented by depth.
 */
export function scrollDestinations(graph: SceneGraph, nodeId: string): DestinationOption[] {
  const screen = graph.closest(
    nodeId,
    (node) => graph.getNode(node.parentId ?? '')?.type === 'CANVAS'
  )
  if (!screen) return []
  const options: DestinationOption[] = []
  const list = (parentId: string, depth: number) => {
    for (const child of graph.getChildren(parentId)) {
      if (!child.visible || options.length >= SCROLL_DESTINATION_LIMIT) continue
      options.push({ value: child.id, label: `${'  '.repeat(depth)}${child.name}` })
      list(child.id, depth + 1)
    }
  }
  const find = (parentId: string) => {
    for (const child of graph.getChildren(parentId)) {
      if (!child.visible) continue
      if (child.overflowDirection !== 'NONE' && child.clipsContent) list(child.id, 0)
      else find(child.id)
    }
  }
  if (screen.overflowDirection === 'NONE') find(screen.id)
  else list(screen.id, 0)
  return options
}
