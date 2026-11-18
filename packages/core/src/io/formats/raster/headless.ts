import type { CanvasKit } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'

import { SkiaRenderer } from '#core/canvas'

import {
  renderNodesToImage,
  renderThumbnail,
  type ExportFormat,
  type RasterExportFormat
} from './render'

let cachedCk: CanvasKit | null = null
/** One offscreen renderer per CanvasKit: the CLI's own, and the app's build when it passes one. */
const renderers = new WeakMap<CanvasKit, Promise<SkiaRenderer>>()

export async function initCanvasKit(): Promise<CanvasKit> {
  if (cachedCk) return cachedCk
  const CanvasKitInit = (await import('canvaskit-wasm/full')).default
  const ckURL = import.meta.resolve('canvaskit-wasm/full')
  cachedCk = await CanvasKitInit({
    locateFile: (file: string) => new URL(file, ckURL).href
  })
  return cachedCk
}

async function createRenderer(ck: CanvasKit): Promise<SkiaRenderer> {
  const surface = ck.MakeSurface(1, 1)
  if (!surface) throw new Error('Failed to create CanvasKit surface')
  const renderer = new SkiaRenderer(ck, surface)
  renderer.viewportWidth = 1
  renderer.viewportHeight = 1
  renderer.dpr = 1
  await renderer.loadFonts()
  return renderer
}

/**
 * The offscreen renderer for `canvasKit`, made on first use. A browser host passes the build its
 * canvas already uses; without one the export renderer loads its own.
 */
async function getRenderer(
  canvasKit?: CanvasKit
): Promise<{ ck: CanvasKit; renderer: SkiaRenderer }> {
  const ck = canvasKit ?? (await initCanvasKit())
  let pending = renderers.get(ck)
  if (!pending) {
    pending = createRenderer(ck)
    renderers.set(ck, pending)
    pending.catch(() => {
      if (renderers.get(ck) === pending) renderers.delete(ck)
    })
  }
  return { ck, renderer: await pending }
}

export async function headlessRenderNodes(
  graph: SceneGraph,
  pageId: string,
  nodeIds: string[],
  options: {
    scale?: number
    format?: ExportFormat
    quality?: number
    trimTransparent?: boolean
  } = {},
  canvasKit?: CanvasKit
): Promise<Uint8Array<ArrayBuffer> | null> {
  const { ck, renderer } = await getRenderer(canvasKit)
  renderer.invalidateAllPictures()
  await renderer.prepareForExport(graph, pageId, nodeIds)
  return renderNodesToImage(ck, renderer, graph, pageId, nodeIds, {
    scale: options.scale ?? 1,
    format: options.format ?? 'PNG',
    quality: options.quality,
    trimTransparent: options.trimTransparent
  })
}

export async function headlessRenderThumbnail(
  graph: SceneGraph,
  pageId: string,
  width: number,
  height: number,
  format: RasterExportFormat = 'PNG',
  quality = 100,
  canvasKit?: CanvasKit
): Promise<Uint8Array<ArrayBuffer> | null> {
  const { ck, renderer } = await getRenderer(canvasKit)
  renderer.invalidateAllPictures()
  await renderer.prepareForExport(graph, pageId, graph.getNode(pageId)?.childIds ?? [])
  return renderThumbnail(ck, renderer, graph, pageId, width, height, format, quality)
}
