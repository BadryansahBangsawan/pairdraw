import type { SceneGraph, SceneNode, Stroke } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'

/**
 * Sets the weight of all of a node's strokes and the weight it keeps with none, as Figma's
 * node-level `strokeWeight` does; the graph gives the strokes the layer's value
 * (`strokeLineChanges`).
 */
export function setStrokeWeight(graph: SceneGraph, node: SceneNode, weight: number): void {
  graph.updateNode(node.id, { strokeWeight: weight })
  recordInstanceOverride(graph, node.id, ['strokeWeight'])
}

/** Sets the alignment of all of a node's strokes and the one it keeps with none. */
export function setStrokeAlign(graph: SceneGraph, node: SceneNode, align: Stroke['align']): void {
  graph.updateNode(node.id, { strokeAlign: align })
  recordInstanceOverride(graph, node.id, ['strokeAlign'])
}

/** Dashes the layer and every stroke on it. */
export function setDashPattern(
  graph: SceneGraph,
  node: SceneNode,
  pattern: readonly number[]
): void {
  graph.updateNode(node.id, { dashPattern: [...pattern] })
  recordInstanceOverride(graph, node.id, ['dashPattern'])
}

export function setIndependentStrokeWeight(
  graph: SceneGraph,
  nodeId: string,
  field: 'borderTopWeight' | 'borderRightWeight' | 'borderBottomWeight' | 'borderLeftWeight',
  value: number
): void {
  graph.updateNode(nodeId, {
    [field]: value,
    independentStrokeWeights: true
  })
  recordInstanceOverride(graph, nodeId, [field, 'independentStrokeWeights'])
}
