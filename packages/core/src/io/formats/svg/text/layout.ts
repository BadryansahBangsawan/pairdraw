import type { CanvasKit } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { withPDFTextLayout } from '#core/io/formats/pdf/prepare'
import { bakeAdjustedImages, hasAdjustedImagePaints } from '#core/io/formats/raster/adjusted-images'
import { renderNodesToSVG, type SVGExportOptions } from '#core/io/formats/svg/export'
import { prepareGraphFonts } from '#core/text/prepare'

/**
 * Layers as SVG with their text set as the canvas sets it: the fonts it draws with loaded, each
 * line on the baseline the canvas gives it, and wrapped paragraphs kept wrapped, as PDF export
 * sets them. An image paint with adjustments is baked to the PNG the raster pipeline draws, so
 * the pattern embeds the adjusted pixels.
 */
export async function renderNodesToLaidOutSVG(
  graph: SceneGraph,
  pageId: string,
  nodeIds: string[],
  options: SVGExportOptions = {},
  canvasKit?: CanvasKit,
  renderer?: SkiaRenderer
): Promise<string | null> {
  await prepareGraphFonts(graph, nodeIds)
  const baked = hasAdjustedImagePaints(graph, nodeIds)
    ? await bakeAdjustedImages(graph, nodeIds, canvasKit, renderer)
    : graph
  return withPDFTextLayout(async (textLayout) =>
    renderNodesToSVG(baked, pageId, nodeIds, { textLayout, ...options })
  )
}
