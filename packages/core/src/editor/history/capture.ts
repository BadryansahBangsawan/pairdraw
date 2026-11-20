import type { SceneNode } from '@pairdraw/scene-graph'
import { cloneInstanceOverrideState } from '@pairdraw/scene-graph/instances/overrides'

/**
 * A copy that keeps the layer's values as they are now. Values are replaced, never written into
 * (`materialize-instance.ts` in `@pairdraw/fig`), so sharing them is safe; the graph edits
 * child lists, source metadata, and override maps in place, so those are copied. It costs a few
 * object spreads where a deep clone of the layer costs its whole value tree, which is what lets
 * undo record thousands of layers.
 */
export function captureNode(node: SceneNode): SceneNode {
  const { source, instanceOverrides } = node
  return {
    ...node,
    childIds: [...node.childIds],
    source: { ...source, fig: { ...source.fig, rawNodeFields: { ...source.fig.rawNodeFields } } },
    instanceOverrides: cloneInstanceOverrideState(instanceOverrides)
  }
}
