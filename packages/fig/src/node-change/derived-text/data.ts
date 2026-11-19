import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import type { SceneNode } from '@pairdraw/scene-graph'
import { resolveNodeTextDirection } from '@pairdraw/scene-graph/text/direction'

type DerivedTextData = NonNullable<NodeChange['derivedTextData']>

interface DerivedTextDataOptions {
  node: SceneNode
  glyphs: DerivedTextData['glyphs']
  decorations?: DerivedTextData['decorations']
  fontMetaData: DerivedTextData['fontMetaData']
  baselines: DerivedTextData['baselines']
  logicalIndexToCharacterOffsetMap: number[]
}

export function buildDerivedTextData(
  options: DerivedTextDataOptions
): NodeChange['derivedTextData'] {
  return {
    layoutSize: { x: options.node.width, y: options.node.height },
    baselines: options.baselines,
    glyphs: options.glyphs,
    ...(options.decorations ? { decorations: options.decorations } : {}),
    fontMetaData: options.fontMetaData,
    logicalIndexToCharacterOffsetMap: options.logicalIndexToCharacterOffsetMap,
    // Figma draws the saved glyphs in these lines, so the label must match their direction.
    derivedLines: [{ directionality: resolveNodeTextDirection(options.node) }],
    truncationStartIndex: -1,
    truncatedHeight: -1
  }
}
