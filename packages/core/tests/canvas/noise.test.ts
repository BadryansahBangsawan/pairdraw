import { afterAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { NOISE_TILE_CACHE_ENTRIES } from '#core/constants'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { SceneGraph, type Effect } from '@pairdraw/scene-graph'

const SIZE = 40

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(SIZE, SIZE), 'surface'))
afterAll(() => renderer.destroy())

const WHITE = { r: 1, g: 1, b: 1, a: 1 }

const noise: Effect = {
  type: 'NOISE',
  color: { r: 0, g: 0, b: 0, a: 1 },
  visible: true,
  noise: { noiseType: 'MONOTONE', noiseSize: { x: 1, y: 1 }, density: 1 }
}

/** A white square with `effects`, drawn at the centre of the surface. */
function renderPixels(effects: Effect[]): number[] {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('The fixture has no page')
  graph.createNode('RECTANGLE', page.id, {
    name: 'Grain',
    width: SIZE,
    height: SIZE,
    fills: [{ type: 'SOLID', color: WHITE, opacity: 1, visible: true }],
    effects
  })
  renderer.pageId = page.id
  renderer.invalidateAllPictures()
  const canvas = renderer.surface.getCanvas()
  canvas.clear(ck.TRANSPARENT)
  renderer.renderSceneToCanvas(canvas, graph, page.id)
  renderer.surface.flush()
  const image = renderer.surface.makeImageSnapshot()
  try {
    const pixels = expectDefined(
      image.readPixels(0, 0, {
        width: SIZE,
        height: SIZE,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'pixels'
    )
    return Array.from(pixels)
  } finally {
    image.delete()
  }
}

/** The red channel of every pixel. */
function reds(pixels: number[]): number[] {
  return Array.from({ length: SIZE * SIZE }, (_, index) => pixels[index * 4])
}

describe('noise effects on the canvas', () => {
  test('a modeled noise grains the layer it sits on', () => {
    const plain = reds(renderPixels([]))
    const grained = reds(renderPixels([noise]))
    const darkened = grained.filter((red, index) => red < plain[index] - 8)
    expect(darkened.length).toBeGreaterThan(0)
  })

  test('a hidden noise leaves the layer alone', () => {
    const plain = reds(renderPixels([]))
    const hidden = reds(renderPixels([{ ...noise, visible: false }]))
    expect(hidden).toEqual(plain)
  })

  test('no noise at zero density', () => {
    const plain = reds(renderPixels([]))
    const none = reds(renderPixels([{ ...noise, noise: { ...noise.noise, density: 0 } }]))
    expect(none).toEqual(plain)
  })

  test('a seed sweep keeps only the bounded number of tiles', () => {
    for (let seed = 0; seed < NOISE_TILE_CACHE_ENTRIES + 4; seed++) {
      renderPixels([{ ...noise, noise: { ...noise.noise, seed } }])
    }
    expect(renderer.noiseTileCache.size).toBe(NOISE_TILE_CACHE_ENTRIES)
  })
})
