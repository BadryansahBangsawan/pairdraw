import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  resolvedNumericBindings,
  resolvedRunBindings,
  resolvedValueBindings
} from '@pairdraw/scene-graph/variables'

/**
 * Figma draws the value a bound field stores until something makes it resolve the binding
 * again, so each node is written with its bindings resolved for its mode, as a graph bound
 * without the editor keeps stale numbers. A bound paint is written as it stores its color and
 * opacity, which are Figma's cache of its variable, edits included.
 * A node without an explicit mode takes its collection's default: the mode the editor happens
 * to show is not saved, and Figma opens the file in the default.
 */
function nodeWithResolvedBindings(graph: SceneGraph, node: SceneNode): SceneNode {
  const changes = {
    ...resolvedNumericBindings(graph, node, 'default'),
    ...resolvedValueBindings(graph, node, 'default'),
    ...resolvedRunBindings(graph, node, 'default')
  }
  return Object.keys(changes).length > 0 ? { ...node, ...changes } : node
}

/**
 * `nodeWithResolvedBindings` once per node for one export. Bindings do not change while a document
 * is written, and an instance's overrides claim the same layers once per overridden field.
 */
export function exportedNode(
  context: { graph: SceneGraph; resolvedNodes?: WeakMap<SceneNode, SceneNode> },
  node: SceneNode
): SceneNode {
  context.resolvedNodes ??= new WeakMap()
  let resolved = context.resolvedNodes.get(node)
  if (!resolved) {
    resolved = nodeWithResolvedBindings(context.graph, node)
    context.resolvedNodes.set(node, resolved)
  }
  return resolved
}
