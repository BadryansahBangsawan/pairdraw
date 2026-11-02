import type { Fill, SceneNode } from '@open-pencil/scene-graph'

/** An image paint that has image data to vectorize. */
export type VectorizableImageFill = Fill & { type: 'IMAGE'; imageHash: string }

function isVectorizableImageFill(fill: Fill): fill is VectorizableImageFill {
  return fill.type === 'IMAGE' && fill.visible && Boolean(fill.imageHash)
}

/**
 * The image a layer shows, which vectorizing converts: its topmost visible image fill, on a layer
 * of any kind. Pages have no fills to convert.
 */
export function vectorizableImageFill(node: SceneNode): VectorizableImageFill | null {
  if (node.type === 'CANVAS') return null
  return node.fills.findLast(isVectorizableImageFill) ?? null
}
