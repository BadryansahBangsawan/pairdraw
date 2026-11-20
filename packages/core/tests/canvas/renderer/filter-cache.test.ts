import { afterEach, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '#core/canvas'
import { initCanvasKit } from '#core/io/formats/raster/headless'
import { EFFECT_FILTER_CACHE_ENTRIES } from '#core/constants'
import { getCachedBlur, getCachedDropShadow, getCachedMaskBlur } from '#core/canvas/effects'

const ck = await initCanvasKit()
let renderer: SkiaRenderer | null = null

function newRenderer(): SkiaRenderer {
  const surface = expectDefined(ck.MakeSurface(16, 16), 'surface')
  renderer = new SkiaRenderer(ck, surface)
  return renderer
}

afterEach(() => {
  renderer?.destroy()
  renderer = null
})

test('a blur slider drag keeps a bounded number of image filters', () => {
  const drawing = newRenderer()
  // One drag: every step is a different radius, as the panel reports it.
  for (let step = 0; step < 500; step++) getCachedBlur(drawing, 1 + step * 0.05)

  expect(drawing.imageFilterCache.size).toBe(EFFECT_FILTER_CACHE_ENTRIES)
})

test('a mask blur slider drag keeps a bounded number of mask filters', () => {
  const drawing = newRenderer()
  for (let step = 0; step < 500; step++) getCachedMaskBlur(drawing, 1 + step * 0.05)

  expect(drawing.maskFilterCache.size).toBe(EFFECT_FILTER_CACHE_ENTRIES)
})

test('a filter the cache still holds comes back as the same one', () => {
  const drawing = newRenderer()
  const shadow = getCachedDropShadow(drawing, 2, 3, 4, new Float32Array([0, 0, 0, 1]))

  expect(getCachedDropShadow(drawing, 2, 3, 4, new Float32Array([0, 0, 0, 1]))).toBe(shadow)
  expect(drawing.imageFilterCache.size).toBe(1)
})
