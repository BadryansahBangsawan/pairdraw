import type { FigmaAPI } from '#core/figma-api'
import { storeImage } from '#core/figma-api/images'
import type { FigmaNodeProxy } from '#core/figma-api/proxy'

import type { StockPhotoProvider, StockPhotoResult } from './providers'

const STOCK_PHOTO_TARGET_TYPES: ReadonlySet<FigmaNodeProxy['type']> = new Set([
  'FRAME',
  'SLOT',
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'ELLIPSE',
  'STAR',
  'POLYGON',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'COMPONENT',
  'INSTANCE'
])

export interface PhotoRequest {
  id: string
  query: string
  index?: number
  orientation?: 'landscape' | 'portrait' | 'square'
}

export interface PhotoResult {
  id: string
  photo?: {
    sourceId: string
    photographer: string
    width: number
    height: number
    provider: string
  }
  error?: string
}

export async function applyPhoto(
  figma: FigmaAPI,
  provider: StockPhotoProvider,
  req: PhotoRequest
): Promise<PhotoResult> {
  const node = figma.getNodeById(req.id)
  if (!node) return { id: req.id, error: 'Not found' }

  if (!STOCK_PHOTO_TARGET_TYPES.has(node.type)) {
    return {
      id: req.id,
      error: `"${node.name}" (${node.type}) is not a suitable stock photo target`
    }
  }

  if (node.type === 'VECTOR' && (node.vectorNetwork.regions?.length ?? 0) === 0) {
    return {
      id: req.id,
      error: `"${node.name}" has no closed vector regions — use closed area geometry`
    }
  }

  if (node.type !== 'BOOLEAN_OPERATION' && node.children.length > 0) {
    return { id: req.id, error: `"${node.name}" has children — use a leaf image placeholder` }
  }

  const perPage = Math.min((req.index ?? 0) + 3, 15)
  const orientation = req.orientation ?? 'landscape'
  const targetDim = Math.max(node.width, node.height)

  let results: StockPhotoResult[]
  try {
    // The download is not part of an enclosing edit: what someone else changes meanwhile stays
    // out of its undo step.
    results = await figma.graph.waitOutsideEdit(
      provider.search(req.query, { perPage, orientation, targetDim })
    )
  } catch (err) {
    return { id: req.id, error: err instanceof Error ? err.message : String(err) }
  }

  if (results.length === 0) return { id: req.id, error: `No photos for "${req.query}"` }
  const photo = results[Math.min(req.index ?? 0, results.length - 1)]

  let imageBytes: Uint8Array
  try {
    imageBytes = await figma.graph.waitOutsideEdit(
      (async () => {
        const response = await fetch(photo.url)
        if (!response.ok) throw new Error(`Download ${response.status}`)
        return new Uint8Array(await response.arrayBuffer())
      })()
    )
  } catch (err) {
    return { id: req.id, error: `Download: ${err instanceof Error ? err.message : String(err)}` }
  }

  const imageHash = storeImage(figma.graph, imageBytes)
  node.fills = [{ type: 'IMAGE', imageHash, scaleMode: 'FILL' }]
  // A missed report does not undo the photo the document already shows.
  if (provider.reportUse) {
    await figma.graph.waitOutsideEdit(
      Promise.resolve(provider.reportUse(photo)).catch(() => undefined)
    )
  }

  return {
    id: node.id,
    photo: {
      sourceId: photo.sourceId,
      photographer: photo.photographer,
      width: photo.width,
      height: photo.height,
      provider: provider.name
    }
  }
}
