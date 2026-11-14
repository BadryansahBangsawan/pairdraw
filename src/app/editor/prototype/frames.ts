import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

/**
 * The frames a navigation can point at: the page's top-level frames, in page order. Figma links to
 * frames and components at the top of the page, not to layers inside them, so the list stays flat.
 */
export function framesOnPage(graph: SceneGraph, pageId: string): SceneNode[] {
  return graph.getChildren(pageId).filter((node) => node.type === 'FRAME')
}
