import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  getAxisAlignedWorldBounds,
  getParentWorldMatrix,
  getWorldMatrix,
  localTransformFromWorld
} from '@pairdraw/scene-graph/coordinate'
import { computeBounds } from '@pairdraw/scene-graph/geometry'
import { findInstanceAncestor } from '@pairdraw/scene-graph/instances'
import type { Mat3 } from '@pairdraw/scene-graph/matrix'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'
import {
  assertRescaleFactor,
  isRescalable,
  rescaleNodeTreeChanges,
  rescaleSubtree
} from '@pairdraw/scene-graph/scaling'

import { scaleAnchorPoint, scaleAroundPoint, type ScaleAnchor } from './anchor'

/** One layer a rescale scales, with its sublayers, as they were when it was captured. */
interface RescaleRoot {
  id: string
  /** The layer and every layer below it, root first. */
  nodes: SceneNode[]
  world: Mat3
  parentWorld: Mat3
}

/**
 * What a rescale scales, captured before it changes anything, so a drag can scale again from the
 * layers as they were at every step.
 */
export interface RescaleSnapshot {
  roots: RescaleRoot[]
  /** The selection's box on the canvas, which a named anchor is a point of. */
  bounds: Rect
}

function hasAncestorIn(graph: SceneGraph, node: SceneNode, ids: ReadonlySet<string>): boolean {
  for (let id = node.parentId; id; id = graph.getNode(id)?.parentId ?? null) {
    if (ids.has(id)) return true
  }
  return false
}

/**
 * The layers among `ids` a rescale scales: those the Scale tool takes, other than the layers
 * inside an instance, whose size comes from their component, and layers below another one listed,
 * which scale with it.
 */
export function rescaleRoots(graph: SceneGraph, ids: Iterable<string>): SceneNode[] {
  const listed = new Set(ids)
  return [...listed].flatMap((id) => {
    const node = graph.getNode(id)
    if (!node || !isRescalable(node)) return []
    if (node.parentId && findInstanceAncestor(graph, node.parentId)) return []
    return hasAncestorIn(graph, node, listed) ? [] : [node]
  })
}

/** The joint box on the canvas of the layers `rescaleRoots` picks from `ids`; null for none. */
export function rescaleBounds(graph: SceneGraph, ids: Iterable<string>): Rect | null {
  const roots = rescaleRoots(graph, ids)
  if (roots.length === 0) return null
  return computeBounds(roots.map((root) => getAxisAlignedWorldBounds(root, graph)))
}

/** Captures the layers `rescaleRoots` picks from `ids`; null when it picks none. */
export function captureRescale(graph: SceneGraph, ids: Iterable<string>): RescaleSnapshot | null {
  const roots = rescaleRoots(graph, ids)
  if (roots.length === 0) return null
  return {
    roots: roots.map((root) => ({
      id: root.id,
      nodes: rescaleSubtree(graph, root).map((node) => ({ ...node })),
      world: getWorldMatrix(root, graph),
      parentWorld: getParentWorldMatrix(
        root.parentId ? graph.getNode(root.parentId) : undefined,
        graph
      )
    })),
    bounds: computeBounds(roots.map((root) => getAxisAlignedWorldBounds(root, graph)))
  }
}

/**
 * Where a scaled root sits in its parent so that, on the canvas, it scaled around `origin`: its
 * corner moves toward or away from the origin by the factor, and it keeps its turn and flips.
 */
function scaledRootPosition(
  root: RescaleRoot,
  original: SceneNode,
  factor: number,
  origin: Vector
): Vector | null {
  const corner = scaleAroundPoint({ x: root.world[2], y: root.world[5] }, origin, factor)
  const world = [...root.world]
  world[2] = corner.x
  world[5] = corner.y
  const scaled = { ...original, width: original.width * factor, height: original.height * factor }
  const local = localTransformFromWorld(scaled, world, root.parentWorld)
  return local ? { x: local.x, y: local.y } : null
}

/**
 * Every change scaling the captured layers by `factor` around `anchor` makes, layer by layer: a
 * named point of the selection's box or a canvas point. Each layer's text, strokes, effects,
 * radii, and spacing scale with it, as Figma's Scale tool scales them.
 */
export function rescaleChanges(
  graph: SceneGraph,
  snapshot: RescaleSnapshot,
  factor: number,
  anchor: ScaleAnchor | Vector
): Map<string, Partial<SceneNode>> {
  assertRescaleFactor(factor)
  const origin = typeof anchor === 'string' ? scaleAnchorPoint(snapshot.bounds, anchor) : anchor
  const changes = new Map<string, Partial<SceneNode>>()
  for (const root of snapshot.roots) {
    const [original] = root.nodes
    for (const [id, change] of rescaleNodeTreeChanges(graph, root.nodes, root.id, factor)) {
      changes.set(id, change)
    }
    const position = scaledRootPosition(root, original, factor, origin)
    const rootChange = changes.get(root.id)
    if (position && rootChange) Object.assign(rootChange, position)
  }
  return changes
}

/**
 * Scales the layers `ids` by `factor` around `anchor`, a point of their joint box (top left by
 * default, as Figma's Scale tool) or a canvas point, writing straight into the graph. Returns the
 * ids of the layers it scaled; layers it cannot scale are left as they are. Callers record the
 * change and lay the pages out, as the editor's `scaleNodes` does.
 */
export function rescaleNodes(
  graph: SceneGraph,
  ids: Iterable<string>,
  factor: number,
  anchor: ScaleAnchor | Vector = 'top-left'
): string[] {
  assertRescaleFactor(factor)
  const snapshot = captureRescale(graph, ids)
  if (!snapshot) return []
  for (const [id, change] of rescaleChanges(graph, snapshot, factor, anchor)) {
    graph.updateNode(id, change)
  }
  return snapshot.roots.map((root) => root.id)
}
