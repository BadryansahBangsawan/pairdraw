import type { Image as CKImage } from 'canvaskit-wasm'

import { ResourceCache } from '#core/cache/resource'

import {
  TILE_DEVICE_SIZE,
  tileKeyString,
  tileWorldSize,
  type TileKey,
  type TileWorldBounds
} from './geometry'
import type { RenderedTile } from './render'

export interface CachedTile {
  key: TileKey
  image: CKImage
  contentGeneration: number
  lastUsed: number
  bytes: number
}

const DEFAULT_MAX_TILE_BYTES = 128 * 1024 * 1024
const MAXIMUM_TILE_CACHE_BYTES = 768 * 1024 * 1024
/**
 * The cache keeps as many viewports of tiles as the background stages work through, so one frame's
 * work never evicts what the next frame draws.
 */
const TILE_CACHE_VIEWPORTS = 5
/** The share of a device's memory the tiles may hold, on a device that reports its memory. */
const DEVICE_MEMORY_SHARE = 1 / 16

const TILE_BYTES = TILE_DEVICE_SIZE * TILE_DEVICE_SIZE * 4

/** What the host knows about the memory the tiles share. */
export interface TileMemory {
  /** The device's memory in bytes, where the host can tell. */
  deviceBytes?: number
  /** The canvas is not on screen: only the tiles it showed last are kept, to show it again. */
  hidden?: boolean
}

/** The bytes of the tiles a viewport of this many device pixels can touch. */
export function viewportTileBytes(widthPx: number, heightPx: number): number {
  return Math.ceil(widthPx / TILE_DEVICE_SIZE) * Math.ceil(heightPx / TILE_DEVICE_SIZE) * TILE_BYTES
}

/**
 * The cache's byte budget for a viewport whose tiles weigh `viewportBytes`: as many viewports as
 * the background stages use, within a share of the device's memory where it is known. The
 * visible tiles always fit, or the view could never finish drawing.
 */
export function viewportTileCacheBudget(viewportBytes: number, memory: TileMemory = {}): number {
  if (memory.hidden) return viewportBytes
  const ceiling =
    memory.deviceBytes === undefined
      ? MAXIMUM_TILE_CACHE_BYTES
      : Math.min(MAXIMUM_TILE_CACHE_BYTES, memory.deviceBytes * DEVICE_MEMORY_SHARE)
  const wanted = Math.max(DEFAULT_MAX_TILE_BYTES, viewportBytes * TILE_CACHE_VIEWPORTS)
  return Math.max(viewportBytes, Math.min(ceiling, wanted))
}

export class TileImageCache {
  private readonly entries: ResourceCache<string, CachedTile>
  private clock = 0

  constructor(maxBytes = DEFAULT_MAX_TILE_BYTES) {
    this.entries = new ResourceCache({
      maxWeight: maxBytes,
      weight: (entry) => entry.bytes,
      dispose: (entry) => entry.image.delete()
    })
  }

  get(key: TileKey): CachedTile | null {
    const id = tileKeyString(key)
    const entry = this.entries.get(id)
    if (!entry) return null
    entry.lastUsed = ++this.clock
    return entry
  }

  getIfPresent(key: TileKey): CachedTile | null {
    return this.entries.peek(tileKeyString(key)) ?? null
  }

  install(tile: RenderedTile, contentGeneration: number): CachedTile | null {
    const id = tileKeyString(tile.key)
    const entry: CachedTile = {
      key: tile.key,
      image: tile.image,
      contentGeneration,
      lastUsed: ++this.clock,
      bytes: tile.image.width() * tile.image.height() * 4
    }
    if (!this.entries.set(id, entry)) {
      entry.image.delete()
      return null
    }
    return entry
  }

  markStale(contentGeneration: number): void {
    for (const entry of this.entries.values()) {
      if (entry.contentGeneration >= contentGeneration)
        entry.contentGeneration = contentGeneration - 1
    }
  }

  invalidateBounds(pageId: string, bounds: TileWorldBounds, contentGeneration: number): number {
    let invalidated = 0
    for (const [id, entry] of this.entries) {
      if (entry.key.pageId !== pageId) continue
      const size = tileWorldSize(entry.key.level)
      const minX = entry.key.x * size
      const minY = entry.key.y * size
      if (
        minX >= bounds.maxX ||
        minY >= bounds.maxY ||
        minX + size <= bounds.minX ||
        minY + size <= bounds.minY
      ) {
        entry.contentGeneration = contentGeneration
        continue
      }
      this.entries.delete(id)
      invalidated++
    }
    return invalidated
  }

  advanceGeneration(contentGeneration: number): void {
    for (const entry of this.entries.values()) entry.contentGeneration = contentGeneration
  }

  clear(): void {
    this.entries.clear()
  }

  size(): number {
    return this.entries.size
  }

  byteSize(): number {
    return this.entries.weight
  }

  /** The cache's byte budget, as `viewportTileCacheBudget` gives it for the current viewport. */
  budget(): number {
    return this.entries.maxBytes
  }

  setBudget(bytes: number): void {
    this.entries.setMaxWeight(bytes)
  }
}
