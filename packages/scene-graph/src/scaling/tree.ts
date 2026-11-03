import type { SceneGraph } from '../graph'
import { findInstanceAncestor } from '../instances'
import type { SceneNode } from '../types'
import { scaleVariableBindingUnits } from '../variables/units'
import { scaleNodeChanges } from './node'

/** The smallest factor a layer scales by, so it never folds away. */
export const MIN_RESCALE = 0.01
const RESCALABLE_NODE_TYPES = new Set<SceneNode['type']>([
  'BOOLEAN_OPERATION',
  'COMPONENT',
  'COMPONENT_SET',
  'ELLIPSE',
  'FRAME',
  'GROUP',
  'INSTANCE',
  'LINE',
  'POLYGON',
  'RECTANGLE',
  'STAR',
  'STICKY',
  'TEXT',
  'VECTOR'
])

/** Whether a layer scales with its contents, as Figma's Scale tool and `rescale()` allow. */
export function isRescalable(node: Pick<SceneNode, 'type'>): boolean {
  return RESCALABLE_NODE_TYPES.has(node.type)
}

/** A layer and every layer below it, root first, as the graph holds them now. */
export function rescaleSubtree(graph: SceneGraph, root: SceneNode): SceneNode[] {
  const nodes: SceneNode[] = [root]
  const collect = (node: SceneNode): void => {
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (!child) continue
      nodes.push(child)
      collect(child)
    }
  }
  collect(root)
  return nodes
}

/**
 * What scaling `nodes`, a subtree as `rescaleSubtree` lists it, by `scale` changes in each layer,
 * keeping the root's top-left; read from the given copies, so a preview can scale again from the
 * layers as they were.
 */
export function rescaleNodeTreeChanges(
  graph: SceneGraph,
  nodes: readonly SceneNode[],
  rootId: string,
  scale: number
): Map<string, Partial<SceneNode>> {
  const changes = new Map<string, Partial<SceneNode>>()
  for (const node of nodes) {
    changes.set(node.id, {
      ...scaleNodeChanges(node, scale, node.id !== rootId),
      ...scaleVariableBindingUnits(node, scale),
      componentScale: findInstanceAncestor(graph, node.id)
        ? node.componentScale * scale
        : node.componentScale
    })
  }
  return changes
}

/** Throws unless `scale` is a factor a layer can be scaled by. */
export function assertRescaleFactor(scale: number): void {
  if (!Number.isFinite(scale)) throw new TypeError('Scale must be a finite number')
  if (scale < MIN_RESCALE) throw new RangeError(`Scale must be at least ${MIN_RESCALE}`)
}

/** Scale a node tree from the root node's top-left, matching Figma's Scale tool. */
export function rescaleNodeTree(graph: SceneGraph, rootId: string, scale: number): void {
  assertRescaleFactor(scale)
  const root = graph.getNode(rootId)
  if (!root || !isRescalable(root)) throw new Error('rescale() is not supported on this node')
  const nodes = rescaleSubtree(graph, root)
  for (const [id, changes] of rescaleNodeTreeChanges(graph, nodes, rootId, scale)) {
    graph.updateNode(id, changes)
  }
}
