import type { Surface } from 'canvaskit-wasm'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { documentImageInfo } from '#core/canvas/renderer/colors'

import { TILE_DEVICE_SIZE } from './geometry'

export class TileSurfacePool {
  private readonly available: Surface[] = []

  acquire(renderer: SkiaRenderer): Surface | null {
    return (
      this.available.pop() ??
      renderer.surface.makeSurface(
        documentImageInfo(
          renderer.ck,
          renderer.documentColorSpace,
          TILE_DEVICE_SIZE,
          TILE_DEVICE_SIZE
        )
      )
    )
  }

  release(surface: Surface): void {
    this.available.push(surface)
  }

  clear(): void {
    for (const surface of this.available) surface.dispose()
    this.available.length = 0
  }

  size(): number {
    return this.available.length
  }
}
