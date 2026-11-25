import { filename } from 'pathe/utils'

import { sceneNodeToJSX, selectionToJSX } from '@pairdraw/design-jsx'
import { isDrawIOExportFileName } from '@pairdraw/drawio'
import type { DocumentKind, SceneGraph } from '@pairdraw/scene-graph'

import { layoutAuthoredNodes } from '#core/layout'

import type { DrawIOExportTarget } from './formats/drawio/export'
import { exportFigFile, parseFigFile } from './formats/fig'
import type { PDFPageSpec } from './formats/pdf/plan'
import { penFormat } from './formats/pen'
import type { PPTXExportOptions } from './formats/pptx'
import { headlessRenderNodes, renderNodesToImage, type RasterExportFormat } from './formats/raster'
import { extractExportGraph, findPageId } from './subgraph'
import type {
  ExportRequest,
  ExportResult,
  FigWriteOptions,
  HTMLExportOptions,
  IOContext,
  IOFormatAdapter,
  IOFormatExportOptions,
  IOFormatSupport,
  PDFFormatExportOptions,
  RasterExportOptions,
  SVGExportOptions
} from './types'

/** Formats that export a document, page, selection, or single node alike. */
const EXPORT_EVERY_TARGET: IOFormatSupport = {
  exportDocument: true,
  exportPage: true,
  exportSelection: true,
  exportNode: true
}

/** Formats with a size of their own, so no export scale or quality. */
const FIXED_SIZE_EXPORT: IOFormatExportOptions = { scale: false, quality: false }

function lowerExt(name: string): string {
  const match = /\.([^.]+)$/.exec(name.toLowerCase())
  return match?.[1] ?? ''
}

function ensureSingleNode(target: ExportRequest['target']): string | null {
  if (target.scope === 'node') return target.nodeId
  if (target.scope === 'selection' && target.nodeIds.length === 1) return target.nodeIds[0]
  return null
}

function resolveExportNodes(request: ExportRequest): { pageId: string; nodeIds: string[] } | null {
  switch (request.target.scope) {
    case 'document': {
      const page = request.graph.getPages()[0]
      return { pageId: page.id, nodeIds: page.childIds }
    }
    case 'page': {
      const page = request.graph.getNode(request.target.pageId)
      if (!page) return null
      return { pageId: page.id, nodeIds: page.childIds }
    }
    case 'selection': {
      const first = request.target.nodeIds[0]
      if (!first) return null
      const pageId = findPageId(request.graph, first)
      if (!pageId) return null
      if (!request.target.nodeIds.every((nodeId) => findPageId(request.graph, nodeId) === pageId)) {
        throw new Error('Export selection must stay on a single page')
      }
      return { pageId, nodeIds: request.target.nodeIds }
    }
    case 'node':
      return resolveExportNodes({
        ...request,
        target: { scope: 'selection', nodeIds: [request.target.nodeId] }
      })
    default:
      return null
  }
}

async function renderRaster(
  request: ExportRequest,
  options: RasterExportOptions,
  context?: IOContext
): Promise<Uint8Array | null> {
  const target = resolveExportNodes(request)
  if (!target) return null
  const scale = options.scale ?? 1

  if (context?.canvasKit && context.renderer) {
    return renderNodesToImage(
      context.canvasKit,
      context.renderer,
      request.graph,
      target.pageId,
      target.nodeIds,
      {
        scale,
        format: options.format,
        quality: options.quality,
        trimTransparent: request.target.scope === 'page' || request.target.scope === 'document'
      }
    )
  }

  return headlessRenderNodes(request.graph, target.pageId, target.nodeIds, {
    scale,
    format: options.format,
    quality: options.quality,
    trimTransparent: request.target.scope === 'page' || request.target.scope === 'document'
  })
}

function rasterFormat<F extends RasterExportFormat>(format: F): IOFormatAdapter<Lowercase<F>> {
  const extension = format.toLowerCase() as Lowercase<F>
  let mimeType = 'image/png'
  if (format === 'JPG') mimeType = 'image/jpeg'
  else if (format === 'WEBP') mimeType = 'image/webp'

  return {
    id: extension,
    label: format,
    role: 'derived-export',
    category: 'raster',
    extensions: [extension],
    mimeTypes: [mimeType],
    support: {
      exportDocument: true,
      exportPage: true,
      exportSelection: true,
      exportNode: true
    },
    exportOptions: {
      scale: true,
      quality: format !== 'PNG',
      colorSpace: false
    },
    async exportContent(request, options?: RasterExportOptions, context?: IOContext) {
      const data = await renderRaster(
        request,
        {
          format,
          scale: options?.scale,
          quality: options?.quality
        },
        context
      )
      if (!data) throw new Error('Nothing to export')
      return {
        format: extension,
        mimeType,
        extension,
        data
      }
    }
  }
}

/** The file a document saves as: Figma's `.fig` for a design, FigJam's `.jam` for a board. */
export const DOCUMENT_EXTENSIONS: Readonly<Record<DocumentKind, 'fig' | 'jam'>> = {
  design: 'fig',
  board: 'jam'
}

export const figFormat: IOFormatAdapter<'fig'> = {
  id: 'fig',
  label: 'Pairdraw Document',
  role: 'native-document',
  category: 'document',
  extensions: ['fig', 'jam'],
  mimeTypes: ['application/octet-stream'],
  support: {
    readDocument: true,
    writeDocument: true,
    exportDocument: true,
    exportPage: true,
    exportSelection: true,
    exportNode: true
  },
  exportOptions: FIXED_SIZE_EXPORT,
  matchesFile(fileName) {
    const ext = lowerExt(fileName)
    return ext === 'fig' || ext === 'jam'
  },
  async readDocument(input) {
    const data = input.data.slice().buffer
    const graph = await parseFigFile(data, { populate: 'first-page' })
    return { graph, sourceFormat: 'fig' }
  },
  async writeDocument(graph, options?: FigWriteOptions, context?: IOContext) {
    return writeFig(graph, options, context, options?.thumbnailPageId)
  },
  async exportContent(request, options?: FigWriteOptions, context?: IOContext) {
    // A whole document is written as it is, so one opened from an archive keeps that archive.
    if (request.target.scope === 'document')
      return writeFig(request.graph, options, context, options?.thumbnailPageId, request.fileName)
    const extracted = extractExportGraph(request.graph, request.target)
    return writeFig(
      extracted.graph,
      options,
      context,
      options?.thumbnailPageId ?? extracted.pageId ?? undefined,
      request.fileName
    )
  }
}

/** A `.fig` named as asked, or else after the file it is written to, or else Untitled. */
async function writeFig(
  graph: SceneGraph,
  options: FigWriteOptions | undefined,
  context: IOContext | undefined,
  pageId: string | undefined,
  fileName?: string
): Promise<ExportResult> {
  const data = await exportFigFile(graph, {
    ck: context?.canvasKit,
    renderer: context?.renderer,
    pageId,
    renderHeadlessThumbnail: options?.renderThumbnail ?? false,
    documentName: options?.documentName ?? (fileName && filename(fileName))
  })
  const extension = DOCUMENT_EXTENSIONS[graph.documentKind]
  return { format: 'fig', mimeType: 'application/octet-stream', extension, data }
}

export const drawioFormat: IOFormatAdapter<'drawio'> = {
  id: 'drawio',
  label: 'draw.io Diagram',
  role: 'interchange-document',
  category: 'document',
  extensions: ['drawio', 'dio'],
  mimeTypes: ['application/vnd.jgraph.mxfile'],
  support: {
    readDocument: true,
    writeDocument: true,
    exportDocument: true,
    exportPage: true,
    exportSelection: true,
    exportNode: true
  },
  exportOptions: FIXED_SIZE_EXPORT,
  laysOutOnRead: true,
  // A draw.io PNG or SVG export opens as its diagram when its name says it is one.
  matchesFile(fileName, mimeType) {
    const ext = lowerExt(fileName)
    return (
      ext === 'drawio' ||
      ext === 'dio' ||
      isDrawIOExportFileName(fileName) ||
      mimeType === 'application/vnd.jgraph.mxfile'
    )
  },
  async readDocument(input) {
    const { readDrawIOBytes } = await import('@pairdraw/drawio')
    const { drawioToSceneGraph } = await import('./formats/drawio')
    const file = readDrawIOBytes(input.data)
    if (!file) throw new Error('This file holds no draw.io diagram')
    if (file.unreadable.length > 0) {
      throw new Error(`Could not read the draw.io pages ${file.unreadable.join(', ')}`)
    }
    const graph = drawioToSceneGraph(file)
    // draw.io stores label text, not the sizes it lays out to.
    layoutAuthoredNodes(
      graph,
      graph.getPages().map((page) => page.id)
    )
    return { graph, sourceFormat: 'drawio' }
  },
  async writeDocument(graph) {
    const pageIds = graph.getPages().map((page) => page.id)
    return writeDrawIO(graph, { pageIds })
  },
  // A page or a selection goes as a one-page diagram; the document, every page.
  async exportContent(request) {
    if (request.target.scope === 'document') {
      const pageIds = request.graph.getPages().map((page) => page.id)
      return writeDrawIO(request.graph, { pageIds })
    }
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    return writeDrawIO(request.graph, target)
  }
}

export const mermaidFormat: IOFormatAdapter<'mermaid'> = {
  id: 'mermaid',
  label: 'Mermaid Diagram',
  role: 'interchange-document',
  category: 'document',
  extensions: ['mmd', 'mermaid'],
  mimeTypes: ['text/vnd.mermaid'],
  support: {
    readDocument: true
  },
  laysOutOnRead: true,
  matchesFile(fileName, mimeType) {
    const ext = lowerExt(fileName)
    return ext === 'mmd' || ext === 'mermaid' || mimeType === 'text/vnd.mermaid'
  },
  async readDocument(input) {
    const { detectMermaidDiagram } = await import('@pairdraw/mermaid')
    const text = new TextDecoder().decode(input.data)
    if (!detectMermaidDiagram(text)) throw new Error('This file holds no Mermaid flowchart')
    // Mermaid stores a diagram's structure, which reading lays out with its text measured.
    const { mermaidToSceneGraph } = await import('./formats/mermaid')
    return { graph: await mermaidToSceneGraph(text), sourceFormat: 'mermaid' }
  }
}

/** Pages or layers as a draw.io file, loading the writer only when one is saved. */
async function writeDrawIO(graph: SceneGraph, target: DrawIOExportTarget): Promise<ExportResult> {
  const { writeDrawIOFile } = await import('@pairdraw/drawio')
  const { sceneGraphToDrawIO } = await import('./formats/drawio')
  const { drawioWriteWarnings, drawioWriteWarningText } = await import('./formats/drawio/warnings')
  const warningDetails = drawioWriteWarnings(graph)
  const written: ExportResult = {
    format: 'drawio',
    mimeType: 'application/vnd.jgraph.mxfile',
    extension: 'drawio',
    data: writeDrawIOFile(sceneGraphToDrawIO(graph, target)),
    encoding: 'utf8'
  }
  if (warningDetails.length === 0) return written
  return {
    ...written,
    warnings: warningDetails.map(drawioWriteWarningText),
    warningDetails
  }
}

export const pngFormat = rasterFormat('PNG')
export const jpgFormat = rasterFormat('JPG')
export const webpFormat = rasterFormat('WEBP')

export const svgFormat: IOFormatAdapter<'svg'> = {
  id: 'svg',
  label: 'SVG',
  role: 'derived-export',
  category: 'vector',
  extensions: ['svg'],
  mimeTypes: ['image/svg+xml'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: { ...FIXED_SIZE_EXPORT, colorSpace: true },
  async exportContent(request, options?: SVGExportOptions, context?: IOContext) {
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { renderNodesToLaidOutSVG } = await import('./formats/svg/text/layout')
    const { booleanPathResolver, needsBooleanPaths } = await import('./formats/boolean-path')
    // A boolean made in Pairdraw stores no result path; the export computes it from the operands.
    const booleanPath = needsBooleanPaths(request.graph)
      ? await booleanPathResolver(context?.canvasKit, context?.renderer)
      : undefined
    const data = await renderNodesToLaidOutSVG(
      request.graph,
      target.pageId,
      target.nodeIds,
      {
        ...options,
        // An export writes the profile the document is stored in, so a Display P3 color keeps its
        // gamut; a caller may still ask for sRGB. PDF and thumbnails render SVG themselves and
        // stay sRGB, as their formats expect.
        colorSpace: options?.colorSpace ?? request.graph.documentColorSpace,
        booleanPath
      },
      context?.canvasKit,
      context?.renderer
    )
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'svg',
      mimeType: 'image/svg+xml',
      extension: 'svg',
      data,
      encoding: 'utf8'
    }
  }
}

/**
 * The PDF pages an export makes. A selection gets a page per layer in the order it lists them,
 * each sized to its layer, as slides and Figma's frame export do, unless `single` asks for one
 * page; a page or a document is one page of its layers unless `frames` asks for a page each.
 */
async function pdfPageSpecs(
  request: ExportRequest,
  options: PDFFormatExportOptions | undefined
): Promise<PDFPageSpec[]> {
  const frames = options?.pages ? options.pages === 'frames' : request.target.scope === 'selection'
  if (frames) {
    const { target } = request
    let ids: string[] | undefined
    if (target.scope === 'selection') ids = target.nodeIds
    else if (target.scope === 'node') ids = [target.nodeId]
    const first = ids?.[0]
    let currentPageId: string | null | undefined
    if (first) currentPageId = findPageId(request.graph, first)
    else if (target.scope === 'page') currentPageId = target.pageId
    else if (target.scope === 'document') currentPageId = request.graph.getPages()[0]?.id
    if (!currentPageId) throw new Error('Nothing to export')
    // Without IDs, the plan takes the page's visible layers, in layer order.
    const { planPDFPages } = await import('./formats/pdf/plan')
    return planPDFPages(request.graph, { mode: 'frames', ids, currentPageId })
  }
  const target = resolveExportNodes(request)
  if (!target) throw new Error('Nothing to export')
  return [target]
}

export const pdfFormat: IOFormatAdapter<'pdf'> = {
  id: 'pdf',
  label: 'PDF',
  role: 'derived-export',
  category: 'vector',
  extensions: ['pdf'],
  mimeTypes: ['application/pdf'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, options?: PDFFormatExportOptions, context?: IOContext) {
    const specs = await pdfPageSpecs(request, options)
    // Embedded, as Figma embeds every face its PDFs draw.
    const { exportPDFDocument } = await import('./formats/pdf/document')
    const data = (
      await exportPDFDocument(
        request.graph,
        specs,
        { embedFonts: true },
        context?.canvasKit,
        context?.renderer
      )
    )?.data
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
      data
    }
  }
}

/**
 * Every top-level frame becomes a slide, so a PPTX document export spans all
 * pages — the shared resolver only reaches the first one.
 */
function resolvePPTXExportNodes(
  request: ExportRequest
): { pageId: string; nodeIds: string[] } | null {
  if (request.target.scope !== 'document') return resolveExportNodes(request)
  const pages = request.graph.getPages()
  if (!pages.length) return null
  return { pageId: pages[0].id, nodeIds: pages.flatMap((page) => page.childIds) }
}

export const pptxFormat: IOFormatAdapter<'pptx'> = {
  id: 'pptx',
  label: 'PowerPoint',
  role: 'derived-export',
  category: 'print',
  extensions: ['pptx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, options?: PPTXExportOptions, context?: IOContext) {
    const target = resolvePPTXExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { renderNodesToPPTX } = await import('./formats/pptx')
    const data = await renderNodesToPPTX(request.graph, target.pageId, target.nodeIds, {
      ...options,
      context: options?.context ?? context
    })
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
      data
    }
  }
}

export const jsxFormat: IOFormatAdapter<'jsx'> = {
  id: 'jsx',
  label: 'JSX',
  role: 'derived-export',
  category: 'code',
  extensions: ['jsx'],
  mimeTypes: ['text/plain', 'text/jsx'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, _options?: unknown, context?: IOContext): Promise<ExportResult> {
    const nodeId = ensureSingleNode(request.target)
    // A page or a document exports its top-level layers, as Tailwind JSX does.
    const target = nodeId ? null : resolveExportNodes(request)
    const { booleanPathResolver, needsBooleanPaths } = await import('./formats/boolean-path')
    const authored = needsBooleanPaths(request.graph)
      ? [...request.graph.getAllNodes()].filter(
          (node) => node.type === 'BOOLEAN_OPERATION' && node.fillGeometry.length === 0
        )
      : []
    const restore: (() => void)[] = []
    if (authored.length > 0) {
      const { parseSVGPath } = await import('@pairdraw/scene-graph/parse-path')
      const booleanPath = await booleanPathResolver(context?.canvasKit, context?.renderer)
      for (const node of authored) {
        const d = booleanPath(request.graph, node)
        if (!d) continue
        const network = parseSVGPath(d, 'EVENODD', { includeOpenRegions: true })
        const carrier = node as typeof node & { vectorNetwork?: typeof network }
        const previous = carrier.vectorNetwork
        carrier.vectorNetwork = network
        restore.push(() => {
          carrier.vectorNetwork = previous
        })
      }
    }
    let data = ''
    try {
      if (nodeId) data = sceneNodeToJSX(nodeId, request.graph)
      else if (target) data = selectionToJSX(target.nodeIds, request.graph)
    } finally {
      for (const undo of restore) undo()
    }
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'jsx',
      mimeType: 'text/plain',
      extension: 'jsx',
      data,
      encoding: 'utf8'
    }
  }
}

export const htmlFormat: IOFormatAdapter<'html'> = {
  id: 'html',
  label: 'HTML',
  role: 'derived-export',
  category: 'code',
  extensions: ['html'],
  mimeTypes: ['text/html'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, options?: HTMLExportOptions, context?: IOContext) {
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { renderNodesToHTML } = await import('./formats/html')
    const { html, assets } = await renderNodesToHTML(
      request.graph,
      target.nodeIds,
      options,
      request.fileName,
      context
    )
    return {
      format: 'html',
      mimeType: 'text/html',
      extension: 'html',
      data: html,
      encoding: 'utf8',
      assets
    }
  }
}

export const tailwindJSXFormat: IOFormatAdapter<'tailwind-jsx'> = {
  id: 'tailwind-jsx',
  label: 'Tailwind JSX',
  role: 'derived-export',
  category: 'code',
  extensions: ['jsx'],
  mimeTypes: ['text/plain', 'text/jsx'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, _options?: unknown, context?: IOContext) {
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { sceneNodesToTailwindJSX } = await import('@pairdraw/dom-css/export')
    const { vectorElement } = await import('#core/io/formats/html/vectors')
    const { booleanPathResolver, needsBooleanPaths } = await import('./formats/boolean-path')
    const booleanPath = needsBooleanPaths(request.graph)
      ? await booleanPathResolver(context?.canvasKit, context?.renderer)
      : undefined
    const data = sceneNodesToTailwindJSX(request.graph, target.nodeIds, {
      vectorElement: (graph, node) => vectorElement(graph, node, booleanPath)
    })
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'tailwind-jsx',
      mimeType: 'text/plain',
      extension: 'jsx',
      data,
      encoding: 'utf8'
    }
  }
}

export { penFormat }

export const BUILTIN_IO_FORMATS = [
  figFormat,
  penFormat,
  drawioFormat,
  mermaidFormat,
  pngFormat,
  jpgFormat,
  webpFormat,
  svgFormat,
  pdfFormat,
  pptxFormat,
  jsxFormat,
  tailwindJSXFormat,
  htmlFormat
] as const satisfies readonly IOFormatAdapter[]

export type BuiltinIOFormatId = (typeof BUILTIN_IO_FORMATS)[number]['id']
