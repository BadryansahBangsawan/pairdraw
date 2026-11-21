import type { SceneNode } from '../types'

/** Whether the node's glyphs were baked along a path, including rotated-as-a-picture text. */
export function followsPath(
  node: Pick<SceneNode, 'derivedTextGlyphs' | 'textPathData' | 'textPathBox'>
): boolean {
  const glyphs = node.derivedTextGlyphs ?? []
  if (glyphs.length === 0) {
    return false
  }
  return (
    !!node.textPathData || !!node.textPathBox || glyphs.some((glyph) => (glyph.rotation ?? 0) !== 0)
  )
}
