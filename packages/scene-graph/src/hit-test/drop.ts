// Where dragged layers land: the frame, section, component, or instance under the point.
import type { SceneGraph } from '../graph'
import type { NodeType, SceneNode } from '../types'
import { containsPoint } from './geometry'

/** Which layers take a drop, and which are only looked through, as in Figma. */
interface DropRules {
  takes: (node: SceneNode) => boolean
  passThrough: ReadonlySet<NodeType>
}

const LAYER_TARGETS = new Set<NodeType>(['FRAME', 'SECTION', 'COMPONENT', 'INSTANCE'])
const COMPONENT_TARGETS = new Set<NodeType>(['FRAME', 'SECTION', 'INSTANCE'])

function dropRules(options: DropTargetOptions): DropRules {
  const { componentSetIds } = options
  if (!componentSetIds) {
    return {
      takes: (node) => LAYER_TARGETS.has(node.type),
      passThrough: new Set(['GROUP', 'COMPONENT_SET'])
    }
  }
  // Components never go into other components, and a set only takes back its own variants.
  return {
    takes: (node) =>
      COMPONENT_TARGETS.has(node.type) ||
      (node.type === 'COMPONENT_SET' && componentSetIds.has(node.id)),
    passThrough: new Set(['GROUP'])
  }
}

function dropTargetIn(
  graph: SceneGraph,
  px: number,
  py: number,
  parent: SceneNode,
  excludeIds: ReadonlySet<string>,
  rules: DropRules,
  transformCache: Map<string, boolean>
): SceneNode | null {
  // A clipped-away part of a child is not under the cursor.
  if (
    parent.type !== 'CANVAS' &&
    parent.clipsContent &&
    !containsPoint(px, py, parent, graph, transformCache)
  )
    return null

  for (let i = parent.childIds.length - 1; i >= 0; i--) {
    const childId = parent.childIds[i]
    if (excludeIds.has(childId)) continue
    const child = graph.nodes.get(childId)
    if (!child || child.internalOnly || !child.visible || child.locked) continue
    const target = rules.takes(child)
    if (!target && !rules.passThrough.has(child.type)) continue

    const deeper = dropTargetIn(graph, px, py, child, excludeIds, rules, transformCache)
    if (deeper) return deeper
    if (target && containsPoint(px, py, child, graph, transformCache)) return child
  }

  return null
}

export interface DropTargetOptions {
  /**
   * Set when the dropped layers are all main components: the component sets they come from.
   * Components then go only into frames, sections, instances, and those sets.
   */
  componentSetIds?: ReadonlySet<string>
}

/**
 * The topmost unlocked frame, section, component, or instance under the point, in its rotated
 * shape and inside its clipping ancestors. Groups and component sets are looked through but never
 * returned, except that a set takes dropped components; locked layers and their contents are
 * skipped.
 */
export function hitTestDropTarget(
  graph: SceneGraph,
  px: number,
  py: number,
  excludeIds: ReadonlySet<string>,
  scopeId?: string,
  options: DropTargetOptions = {}
): SceneNode | null {
  const scope = graph.nodes.get(scopeId ?? graph.rootId)
  if (!scope) return null
  return dropTargetIn(graph, px, py, scope, excludeIds, dropRules(options), new Map())
}
