import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit, renderNodesToImage } from '@pairdraw/core/io/formats/raster'
import { SceneGraph } from '@pairdraw/scene-graph'

const ck = await initCanvasKit()

function roundedRect() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const node = graph.createNode('RECTANGLE', page.id, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    cornerRadius: 24,
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, opacity: 1, visible: true }]
  })
  return { graph, pageId: page.id, nodeId: node.id }
}

/** The RGBA a raster export's top-left pixel has. */
function cornerPixel(format: 'PNG' | 'JPG') {
  const { graph, pageId, nodeId } = roundedRect()
  const surface = expectDefined(ck.MakeSurface(1, 1), 'surface')
  const renderer = new SkiaRenderer(ck, surface)
  try {
    const bytes = expectDefined(
      renderNodesToImage(ck, renderer, graph, pageId, [nodeId], { scale: 1, format }),
      'bytes'
    )
    const image = expectDefined(ck.MakeImageFromEncoded(bytes), 'image')
    const pixels = expectDefined(
      image.readPixels(0, 0, {
        alphaType: ck.AlphaType.Unpremul,
        colorType: ck.ColorType.RGBA_8888,
        colorSpace: ck.ColorSpace.SRGB,
        width: 1,
        height: 1
      }),
      'pixels'
    )
    image.delete()
    return Array.from(pixels)
  } finally {
    renderer.destroy()
  }
}

test('JPG export fills transparent corners white, as Figma does', () => {
  const [r, g, b, a] = cornerPixel('JPG')
  expect(a).toBe(255)
  // JPEG is lossy at a sharp edge, so white arrives a few levels off.
  expect([r, g, b].every((channel) => channel > 245)).toBeTrue()
})

test('PNG export keeps transparent corners', () => {
  expect(cornerPixel('PNG')[3]).toBe(0)
})
