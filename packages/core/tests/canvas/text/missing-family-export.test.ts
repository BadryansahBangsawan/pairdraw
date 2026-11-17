import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph } from '@pairdraw/scene-graph'

import { SkiaRenderer } from '#core/canvas'
import { initCanvasKit, renderNodesToImage } from '#core/io/formats/raster'
const inkPixels = (ck: CanvasKit, png: Uint8Array): number => {
  const image = expectDefined(ck.MakeImageFromEncoded(png))
  try {
    const pixels = expectDefined(
      image.readPixels(0, 0, {
        width: image.width(),
        height: image.height(),
        alphaType: ck.AlphaType.Unpremul,
        colorType: ck.ColorType.RGBA_8888,
        colorSpace: ck.ColorSpace.SRGB
      })
    )
    let drawn = 0
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 10) drawn++
    return drawn
  } finally {
    image.delete()
  }
}

/**
 * A family the document asks for and no source has must still draw its text, in the substitute
 * face the layout falls back to; it used to render as an empty layer with only a warning.
 */
describe('raster export of text in a family that is not installed', () => {
  let ck: CanvasKit
  let renderer: SkiaRenderer

  beforeAll(async () => {
    ck = await initCanvasKit()
    renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1)))
    await renderer.loadFonts()
  })

  afterAll(() => renderer.destroy())

  test('draws the text in the substitute face', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', page, { width: 200, height: 60, fills: [] })
    graph.createNode('TEXT', frame.id, {
      text: 'Missing family',
      fontFamily: 'Not Installed Family 123',
      fontSize: 24,
      width: 200,
      height: 60,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    await renderer.prepareForExport(graph, page, [frame.id])
    const png = expectDefined(
      renderNodesToImage(ck, renderer, graph, page, [frame.id], {
        scale: 1,
        format: 'PNG',
        trimTransparent: false
      })
    )

    expect(inkPixels(ck, png)).toBeGreaterThan(500)
  })
})
