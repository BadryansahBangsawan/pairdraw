import type { CanvasKit, Canvas, Image as CanvasImage } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { RenderColorSpace } from '@pairdraw/scene-graph/color'
import { getWorldMatrix } from '@pairdraw/scene-graph/coordinate'
import { computeDescendantVisualBounds, type VisualBounds } from '@pairdraw/scene-graph/geometry'
import Matrix, { type Mat3 } from '@pairdraw/scene-graph/matrix'
import { resolvedVariableModes } from '@pairdraw/scene-graph/variables'

import type { SkiaRenderer } from '#core/canvas'
import { skColorSpace } from '#core/canvas/renderer/colors'
import { getPageColor } from '#core/figma-api/page-backgrounds'
import { extractExportGraph, findPageId } from '#core/io/subgraph'

export type RasterExportFormat = 'PNG' | 'JPG' | 'WEBP'
export type ExportFormat = RasterExportFormat | 'SVG'

interface RenderOptions {
  scale: number
  format: ExportFormat
  quality?: number
  colorSpace?: RenderColorSpace
  trimTransparent?: boolean
}

/** Pixels an export may hold before it is refused, keeping a large scale from aborting CanvasKit. */
export const MAX_EXPORT_PIXELS = 150_000_000
/** Intermediate pixels above which the 2× supersampling that sharpens small exports is dropped. */
const SUPERSAMPLE_PIXELS = 150_000_000

/** Throws when an export of `width`×`height` pixels is larger than the renderer may allocate. */
export function assertExportSize(width: number, height: number): void {
  if (width * height > MAX_EXPORT_PIXELS) {
    throw new Error(
      `Export is too large: ${width}×${height} pixels (limit ${MAX_EXPORT_PIXELS}). Reduce the scale.`
    )
  }
}

/** The scale an export renders at before downsampling: 2× while it stays within the budget. */
export function exportRenderScale(width: number, height: number): number {
  return width * height * 4 <= SUPERSAMPLE_PIXELS ? 2 : 1
}

function ensureSinglePageSelection(graph: SceneGraph, pageId: string, nodeIds: string[]): boolean {
  return nodeIds.every((nodeId) => findPageId(graph, nodeId) === pageId)
}

export function computeContentBounds(graph: SceneGraph, nodeIds: string[]) {
  return computeDescendantVisualBounds(
    nodeIds,
    (id) => graph.getNode(id),
    (id) => graph.getAbsolutePosition(id)
  )
}

function ckImageFormat(ck: CanvasKit, format: ExportFormat) {
  switch (format) {
    case 'JPG':
      return ck.ImageFormat.JPEG
    case 'WEBP':
      return ck.ImageFormat.WEBP
    default:
      return ck.ImageFormat.PNG
  }
}

function findAlphaBounds(ck: CanvasKit, canvas: Canvas, width: number, height: number) {
  const pixels = canvas.readPixels(0, 0, {
    alphaType: ck.AlphaType.Unpremul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB,
    width,
    height
  })
  if (!pixels) return null

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    const row = y * width * 4
    for (let x = 0; x < width; x++) {
      if (pixels[row + x * 4 + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + 1)
      maxY = Math.max(maxY, y + 1)
    }
  }

  if (maxX < minX || maxY < minY) return null
  return { minX, minY, maxX, maxY }
}

const MIN_TRANSPARENT_TRIM_INSET = 2

function shouldTrimAlphaBounds(
  alphaBounds: NonNullable<ReturnType<typeof findAlphaBounds>>,
  width: number,
  height: number
): boolean {
  return (
    Math.max(
      alphaBounds.minX,
      alphaBounds.minY,
      width - alphaBounds.maxX,
      height - alphaBounds.maxY
    ) >= MIN_TRANSPARENT_TRIM_INSET
  )
}

/** Encodes `image`, whose pixels are `width`×`height`, falling back to the host's encoder. */
function encodeImage(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  image: CanvasImage,
  width: number,
  height: number,
  format: ExportFormat,
  quality: number
): Uint8Array<ArrayBuffer> | null {
  const encoded = image.encodeToBytes(ckImageFormat(ck, format), quality)
  if (encoded) return new Uint8Array(encoded)
  if (format !== 'JPG' && format !== 'WEBP') return null
  const raw = image.readPixels(0, 0, {
    alphaType: ck.AlphaType.Unpremul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB,
    width,
    height
  })
  return raw instanceof Uint8Array
    ? renderer.encodeRasterFallback(raw, width, height, format, quality)
    : null
}

function renderToSurface(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  renderGraph: SceneGraph,
  pageId: string,
  width: number,
  height: number,
  format: ExportFormat,
  quality: number,
  setup: (canvas: Canvas) => void,
  trimTransparent = false
): Uint8Array<ArrayBuffer> | null {
  renderer.useDocumentColorSpace(renderGraph.documentColorSpace)
  const documentSpace = skColorSpace(ck, renderGraph.documentColorSpace)
  const renderScale = exportRenderScale(width, height)
  const renderWidth = width * renderScale
  const renderHeight = height * renderScale
  const pixels = ck.Malloc(Uint8Array, renderWidth * renderHeight * 4)
  const surface = ck.MakeRasterDirectSurface(
    {
      alphaType: ck.AlphaType.Premul,
      colorType: ck.ColorType.RGBA_8888,
      colorSpace: documentSpace,
      width: renderWidth,
      height: renderHeight
    },
    pixels,
    renderWidth * 4
  )
  if (!surface) {
    ck.Free(pixels)
    throw new Error(`Could not allocate a ${renderWidth}×${renderHeight} export surface.`)
  }

  const drawnFor = renderer.supersampledOutput
  try {
    const canvas = surface.getCanvas()
    canvas.scale(renderScale, renderScale)
    setup(canvas)
    renderer.supersampledOutput =
      renderScale > 1
        ? {
            outputFromWorld: Matrix.multiply(
              Matrix.scaled(1 / renderScale, 1 / renderScale),
              canvas.getTotalMatrix()
            )
          }
        : null
    renderer.renderSceneToCanvas(canvas, renderGraph, pageId)
    surface.flush()

    const highResImage = surface.makeImageSnapshot()
    // At the export's own scale the snapshot is already the output: encode it without a second
    // full-size surface, which a large export would not have room for.
    if (renderScale === 1 && !trimTransparent) {
      const directBytes = encodeImage(ck, renderer, highResImage, width, height, format, quality)
      highResImage.delete()
      return directBytes
    }
    const downsamplePixels = ck.Malloc(Uint8Array, width * height * 4)
    const downsampleSurface = ck.MakeRasterDirectSurface(
      {
        alphaType: ck.AlphaType.Premul,
        colorType: ck.ColorType.RGBA_8888,
        colorSpace: documentSpace,
        width,
        height
      },
      downsamplePixels,
      width * 4
    )
    if (!downsampleSurface) {
      ck.Free(downsamplePixels)
      highResImage.delete()
      throw new Error(`Could not allocate a ${width}×${height} export surface.`)
    }
    const downsampleCanvas = downsampleSurface.getCanvas()
    downsampleCanvas.clear(ck.TRANSPARENT)
    downsampleCanvas.drawImageRectOptions(
      highResImage,
      ck.LTRBRect(0, 0, renderWidth, renderHeight),
      ck.LTRBRect(0, 0, width, height),
      ck.FilterMode.Linear,
      ck.MipmapMode.None,
      null
    )
    downsampleSurface.flush()
    highResImage.delete()

    const foundAlphaBounds = trimTransparent
      ? findAlphaBounds(ck, downsampleCanvas, width, height)
      : null
    const alphaBounds =
      foundAlphaBounds && shouldTrimAlphaBounds(foundAlphaBounds, width, height)
        ? foundAlphaBounds
        : null
    const image = alphaBounds
      ? downsampleSurface.makeImageSnapshot([
          alphaBounds.minX,
          alphaBounds.minY,
          alphaBounds.maxX,
          alphaBounds.maxY
        ])
      : downsampleSurface.makeImageSnapshot()
    const encoded = image.encodeToBytes(ckImageFormat(ck, format), quality)
    let resultBytes: Uint8Array<ArrayBuffer> | null = encoded ? new Uint8Array(encoded) : null

    // CanvasKit's `encodeToBytes` returns null for JPEG/WEBP in this build, so
    // fall back to encoding the raw pixels through the browser canvas.
    if (!resultBytes && (format === 'JPG' || format === 'WEBP')) {
      const exportWidth = alphaBounds ? alphaBounds.maxX - alphaBounds.minX : width
      const exportHeight = alphaBounds ? alphaBounds.maxY - alphaBounds.minY : height
      const exportMinX = alphaBounds ? alphaBounds.minX : 0
      const exportMinY = alphaBounds ? alphaBounds.minY : 0

      const rawPixels = downsampleCanvas.readPixels(exportMinX, exportMinY, {
        alphaType: ck.AlphaType.Unpremul,
        colorType: ck.ColorType.RGBA_8888,
        colorSpace: ck.ColorSpace.SRGB,
        width: exportWidth,
        height: exportHeight
      })

      if (rawPixels instanceof Uint8Array) {
        resultBytes = renderer.encodeRasterFallback(
          rawPixels,
          exportWidth,
          exportHeight,
          format,
          quality
        )
      }
    }

    image.delete()
    downsampleSurface.delete()
    ck.Free(downsamplePixels)
    return resultBytes
  } finally {
    renderer.supersampledOutput = drawnFor
    surface.dispose()
    ck.Free(pixels)
  }
}

/**
 * `nodeIds` in the order the source page paints them, bottom to top, whatever order they came in,
 * without those a selected ancestor already paints.
 */
function inPaintOrder(source: SceneGraph, pageId: string, nodeIds: readonly string[]): string[] {
  const selected = new Set(nodeIds)
  const ordered: string[] = []
  const visit = (id: string): void => {
    if (selected.has(id)) {
      ordered.push(id)
      return
    }
    for (const childId of source.getNode(id)?.childIds ?? []) visit(childId)
  }
  visit(pageId)
  return ordered
}

export function prepareSelectionRenderGraph(
  source: SceneGraph,
  renderGraph: SceneGraph,
  pageId: string,
  nodeIds: string[]
): void {
  const page = renderGraph.getNode(pageId)
  if (!page) return

  page.childIds = inPaintOrder(source, pageId, nodeIds).filter(
    (nodeId) => renderGraph.getNode(nodeId) !== undefined
  )
  for (const nodeId of page.childIds) {
    const node = renderGraph.getNode(nodeId)
    const sourceNode = source.getNode(nodeId)
    if (!node || !sourceNode) continue
    if (sourceNode.parentId === pageId) continue
    const world = getWorldMatrix(sourceNode, source)
    node.parentId = pageId
    // The page is now the parent, so the modes the ancestors set must stay on the node.
    node.variableModes = resolvedVariableModes(source, nodeId)
    applyWorldTransform(node, world)
  }
  renderGraph.clearAbsPosCache()
}

function applyWorldTransform(node: SceneNode, matrix: Mat3): void {
  const determinant = matrix[0] * matrix[4] - matrix[1] * matrix[3]
  const flipX = determinant < 0
  const rotation = Math.atan2(matrix[3], flipX ? matrix[4] : matrix[0])
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const centerX = node.width / 2
  const centerY = node.height / 2
  const m00 = flipX ? -cos : cos
  const m01 = flipX ? sin : -sin
  const m10 = sin
  const m11 = cos

  node.x = matrix[2] - centerX + m00 * centerX + m01 * centerY
  node.y = matrix[5] - centerY + m10 * centerX + m11 * centerY
  node.rotation = rotation * (180 / Math.PI)
  node.flipX = flipX
  node.flipY = false
}

export function renderNodesToImage(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  graph: SceneGraph,
  pageId: string,
  nodeIds: string[],
  options: RenderOptions
): Uint8Array<ArrayBuffer> | null {
  if (!ensureSinglePageSelection(graph, pageId, nodeIds)) {
    throw new Error('Raster export selection must stay on a single page')
  }

  const bounds = computeContentBounds(graph, nodeIds)
  if (!bounds) return null

  const contentW = bounds.maxX - bounds.minX
  const contentH = bounds.maxY - bounds.minY
  if (contentW <= 0 || contentH <= 0) return null

  const pixelW = Math.ceil(contentW * options.scale)
  const pixelH = Math.ceil(contentH * options.scale)
  if (pixelW <= 0 || pixelH <= 0) return null
  assertExportSize(pixelW, pixelH)

  // Figma exports a layer by itself, without the page behind it, even when it blends.
  const extracted = extractExportGraph(graph, { scope: 'selection', nodeIds })
  if (!extracted.pageId) return null
  prepareSelectionRenderGraph(graph, extracted.graph, extracted.pageId, nodeIds)

  const quality = options.quality ?? (options.format === 'PNG' ? 100 : 90)
  return renderToSurface(
    ck,
    renderer,
    extracted.graph,
    extracted.pageId,
    pixelW,
    pixelH,
    options.format,
    quality,
    (canvas) => {
      // JPEG has no transparency; Figma fills whatever the layer leaves clear with white.
      canvas.clear(options.format === 'JPG' ? ck.WHITE : ck.TRANSPARENT)
      canvas.scale(options.scale, options.scale)
      canvas.translate(-bounds.minX, -bounds.minY)
    },
    options.trimTransparent
  )
}

export interface ThumbnailFrame {
  /** The page content the thumbnail shows. */
  bounds: VisualBounds
  scale: number
  /** The thumbnail's size in pixels. */
  width: number
  height: number
}

/** The page region a thumbnail fitted into `width` by `height` pixels shows, and its size. */
export function thumbnailFrame(
  graph: SceneGraph,
  pageId: string,
  width: number,
  height: number
): ThumbnailFrame | null {
  const page = graph.getNode(pageId)
  if (!page || page.childIds.length === 0) return null

  const bounds = computeContentBounds(graph, page.childIds)
  if (!bounds) return null

  const contentW = bounds.maxX - bounds.minX
  const contentH = bounds.maxY - bounds.minY
  if (contentW <= 0 || contentH <= 0) return null

  const scale = Math.min(width / contentW, height / contentH)
  return {
    bounds,
    scale,
    width: Math.max(1, Math.round(contentW * scale)),
    height: Math.max(1, Math.round(contentH * scale))
  }
}

export function renderThumbnail(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  graph: SceneGraph,
  pageId: string,
  width: number,
  height: number,
  format: RasterExportFormat = 'PNG',
  quality = 100
): Uint8Array<ArrayBuffer> | null {
  const frame = thumbnailFrame(graph, pageId, width, height)
  if (!frame) return null
  const { bounds, scale, width: pixelW, height: pixelH } = frame
  // The page's own background, which the editor's page colour matches only while it is open.
  const background = getPageColor(graph.getNode(pageId))

  return renderToSurface(ck, renderer, graph, pageId, pixelW, pixelH, format, quality, (canvas) => {
    canvas.clear(ck.Color4f(background.r, background.g, background.b, 1))
    canvas.translate(-bounds.minX * scale, -bounds.minY * scale)
    canvas.scale(scale, scale)
  })
}

/** Draws a page region with `renderer`; `region.ts` gives it a renderer of its own. */
export function drawRegionToImage(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  graph: SceneGraph,
  pageId: string,
  bounds: VisualBounds,
  scale: number
): Uint8Array<ArrayBuffer> | null {
  const pixelW = Math.max(1, Math.round((bounds.maxX - bounds.minX) * scale))
  const pixelH = Math.max(1, Math.round((bounds.maxY - bounds.minY) * scale))
  if (!graph.getNode(pageId) || !Number.isFinite(pixelW * pixelH)) return null
  return renderToSurface(ck, renderer, graph, pageId, pixelW, pixelH, 'PNG', 100, (canvas) => {
    canvas.clear(ck.Color4f(renderer.pageColor.r, renderer.pageColor.g, renderer.pageColor.b, 1))
    canvas.scale(scale, scale)
    canvas.translate(-bounds.minX, -bounds.minY)
  })
}
