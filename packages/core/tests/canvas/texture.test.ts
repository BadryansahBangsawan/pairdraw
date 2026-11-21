import { afterAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { SceneGraph, type Effect } from '@pairdraw/scene-graph'

const SIZE = 40

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(SIZE, SIZE), 'surface'))
afterAll(() => renderer.destroy())

const texture: Effect = {
  type: 'TEXTURE',
  color: { r: 0, g: 0, b: 0, a: 1 },
  radius: 6,
  visible: true,
  texture: { noiseSize: { x: 4, y: 4 }, clipToShape: false, seed: 7 }
}

/** A white square with `effects`, drawn at the centre of the surface. */
function renderPixels(effects: Effect[]): number[] {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('The fixture has no page')
  graph.createNode('RECTANGLE', page.id, {
    name: 'Rough',
    width: SIZE,
    height: SIZE,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
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

describe('texture effects on the canvas', () => {
  test('a texture moves the layer’s edges by its radius', () => {
    const plain = renderPixels([])
    const roughened = renderPixels([texture])
    const changed = roughened.filter((value, index) => Math.abs(value - plain[index]) > 8)
    expect(changed.length).toBeGreaterThan(0)
  })

  test('a hidden texture leaves the layer alone', () => {
    const plain = renderPixels([])
    const hidden = renderPixels([{ ...texture, visible: false }])
    expect(hidden).toEqual(plain)
  })

  test('the same seed draws the same texture twice', () => {
    expect(renderPixels([texture])).toEqual(renderPixels([texture]))
  })
})
