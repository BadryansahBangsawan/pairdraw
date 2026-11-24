import { expect, test } from 'bun:test'

import { ResourceCache } from '#core/cache/resource'
import { viewportTileBytes, viewportTileCacheBudget } from '#core/canvas/renderer/tiles/cache'
import { TILE_DEVICE_SIZE } from '#core/canvas/renderer/tiles/geometry'

const TILE_BYTES = TILE_DEVICE_SIZE * TILE_DEVICE_SIZE * 4
const MIB = 1024 * 1024

test('a viewport lends the cache the bytes of the tiles it shows', () => {
  expect(viewportTileBytes(11 * TILE_DEVICE_SIZE, 8 * TILE_DEVICE_SIZE)).toBe(88 * TILE_BYTES)
  // A viewport not cut to whole tiles still needs the tile holding its edge.
  expect(viewportTileBytes(1, 1)).toBe(TILE_BYTES)
})

test('a device that reports its memory lends the tiles a sixteenth of it, within 768 MiB', () => {
  // 4 GB / 16 = 256 MiB, under the 768 MiB ceiling and under five viewports of this size.
  const wide = 300 * TILE_BYTES
  expect(viewportTileCacheBudget(wide, { deviceBytes: 4 * 1024 ** 3 })).toBe(256 * MIB)
  // An unreported device keeps the fixed ceiling.
  const huge = 2000 * TILE_BYTES
  expect(viewportTileCacheBudget(huge)).toBe(768 * MIB)
})

test('a hidden canvas keeps the tiles it showed last until it is back', () => {
  const viewport = 300 * TILE_BYTES
  expect(viewportTileCacheBudget(viewport, { deviceBytes: 4 * 1024 ** 3, hidden: true })).toBe(
    viewport
  )
})

test('the visible tiles always fit, however little the device has', () => {
  const viewport = 200 * TILE_BYTES
  expect(viewportTileCacheBudget(viewport, { deviceBytes: 512 * MIB })).toBe(viewport)
})

test('a shrinking weight budget evicts least recently used entries first', () => {
  const cache = new ResourceCache<string, number>({ maxWeight: 10, weight: (bytes) => bytes })
  cache.set('first', 6)
  cache.set('second', 4)

  cache.setMaxWeight(5)

  expect(cache.size).toBe(1)
  expect(cache.has('first')).toBe(false)
  expect(cache.has('second')).toBe(true)
  expect(cache.maxBytes).toBe(5)
})
