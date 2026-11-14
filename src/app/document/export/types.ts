import type { HTMLExportOptions, PDFFormatExportOptions } from '@pairdraw/core/io'

/** How an HTML export is written, as the Export panel and the Code panel offer it. */
export type HTMLExportSettings = Required<
  Pick<HTMLExportOptions, 'html' | 'style' | 'assets' | 'layerNames' | 'layerIds'>
>

export type ExportOptions = {
  scale?: number
  /** JPG and WEBP quality from 1 to 100; other formats ignore it. */
  quality?: number
  /** How an HTML export is written; other formats ignore it. */
  html?: HTMLExportSettings
  /**
   * A PDF's pages: `frames`, a page per layer in the order given, which a selection of several
   * layers gets by default; `single`, every layer on one page. Other formats ignore it.
   */
  pdfPages?: PDFFormatExportOptions['pages']
}
