import type { SceneNode } from '../types'

/**
 * A frame's children in the order they are drawn, back to front. An auto layout frame asked for
 * Figma's "Reverse Z-index" paints them in reverse: the first layer sits on top, so the last one
 * is drawn first. Everywhere else, and in a frame without auto layout, layer order draws.
 */
export function drawnChildIds(
  parent: Pick<SceneNode, 'childIds' | 'layoutMode' | 'itemReverseZIndex'>
): string[] {
  if (parent.layoutMode === 'NONE' || !parent.itemReverseZIndex) return parent.childIds
  return [...parent.childIds].reverse()
}
