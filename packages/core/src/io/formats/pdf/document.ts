import type { CanvasKit } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { bakeAdjustedImages, hasAdjustedImagePaints } from '#core/io/formats/raster/adjusted-images'
import { fontManager } from '#core/text/font/manager'

import { renderPagesToPDFDetailed, type PDFExportResult } from './export'
import type { PDFPageSpec } from './plan'
import { pdfFontFaces, preparePagesForPDF, preparePDFFonts, withPDFTextLayout } from './prepare'

export interface PDFDocumentOptions {
  /** Embed the font files the text uses; without them, text uses standard PDF fonts. */
  embedFonts: boolean
  /** Lay the pages out first, as pages other than the open one have no layout yet. */
  layOutPages?: boolean
  title?: string
}

/**
 * A PDF of the pages as the canvas draws them: the fonts their text uses loaded, and each
 * paragraph broken into the lines the canvas breaks it into. Null when no page shows anything.
 */
export async function exportPDFDocument(
  graph: SceneGraph,
  specs: readonly PDFPageSpec[],
  options: PDFDocumentOptions,
  canvasKit?: CanvasKit,
  renderer?: SkiaRenderer
): Promise<PDFExportResult | null> {
  const nodeIds = specs.flatMap((spec) => spec.nodeIds)
  const baked = hasAdjustedImagePaints(graph, nodeIds)
    ? await bakeAdjustedImages(graph, nodeIds, canvasKit, renderer)
    : graph
  const status = options.layOutPages
    ? await preparePagesForPDF(baked, specs)
    : await preparePDFFonts(baked, specs)
  const fonts = options.embedFonts ? pdfFontFaces(status) : undefined
  return withPDFTextLayout((textLayout) =>
    renderPagesToPDFDetailed(baked, specs, {
      fonts,
      textLayout,
      fallbackFile: (family, style, file) =>
        file === 0
          ? fontManager.loadedData(family, style)
          : (fontManager.shardData(family, style)[file - 1] ?? null),
      title: options.title
    })
  )
}
