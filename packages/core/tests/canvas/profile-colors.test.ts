import { afterAll, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { noiseUniformValues } from '@pairdraw/core/canvas/noise/shader'
import { setPageBackgrounds } from '@pairdraw/core/figma-api/page-backgrounds'
import { initCanvasKit, renderNodesToImage, renderThumbnail } from '@pairdraw/core/io/formats/raster'
import { SceneGraph, type Effect, type NoiseEffect } from '@pairdraw/scene-graph'

const SIZE = 40
const P3_RED = { r: 1, g: 0, b: 0, a: 1 }

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(SIZE, SIZE), 'surface'))
afterAll(() => renderer.destroy())

/** `png` decoded, with the component at `x`, `y` read in Display P3. */
function pixelInP3(png: Uint8Array, x: number, y: number): number[] {
  const image = expectDefined(ck.MakeImageFromEncoded(png), 'image')
  try {
    const pixels = expectDefined(
      image.readPixels(x, y, {
        width: 1,
        height: 1,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.DISPLAY_P3
      }),
      'pixels'
    )
    return Array.from(pixels.subarray(0, 3))
  } finally {
    image.delete()
  }
}

/** A page holding a white square that casts `effects`, sized to leave the shadow visible. */
function shadowCard(effects: Effect[]) {
  const graph = new SceneGraph()
  graph.documentColorSpace = 'display-p3'
  const pageId = graph.getPages()[0].id
  // A container casts its shadow from its children's silhouette, which builds the color itself.
  const frame = graph.createNode('FRAME', pageId, {
    name: 'Card',
    width: 120,
    height: 60,
    fills: [],
    effects
  })
  // Children closer than the shadow's reach keep the container's shadow on the silhouette path.
  for (const x of [0, 10]) {
    graph.createNode('RECTANGLE', frame.id, {
      name: `Ink ${x}`,
      x,
      width: 40,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
  }
  return { graph, pageId, frameId: frame.id }
}

// A colour both profiles hold, so the pixel tells the spaces apart. An image filter's colour is
// clamped to sRGB by Skia, so a shadow further out than sRGB cannot show it; see the report.
const warmShadow: Effect = {
  type: 'DROP_SHADOW',
  color: { r: 0.8, g: 0.4, b: 0.3, a: 1 },
  offset: { x: 60, y: 0 },
  radius: 0,
  spread: 0,
  visible: true
}

test('a silhouette shadow draws its color in the document profile', () => {
  const { graph, pageId, frameId } = shadowCard([warmShadow])
  const png = expectDefined(
    renderNodesToImage(ck, renderer, graph, pageId, [frameId], { scale: 1, format: 'PNG' }),
    'png'
  )
  // Inside the offset shadow only: the shape sits at x 0..40, the shadow at x 60..100.
  const pixel = pixelInP3(png, 100, 20)
  expect(pixel[0]).toBeCloseTo(204, -1)
  expect(pixel[1]).toBeCloseTo(102, -1)
  expect(pixel[2]).toBeCloseTo(77, -1)
})

test('a page background clears in the document profile', () => {
  const graph = new SceneGraph()
  graph.documentColorSpace = 'display-p3'
  const page = graph.getPages()[0]
  setPageBackgrounds(graph, page, [
    { type: 'SOLID', color: P3_RED, opacity: 1, visible: true }
  ])
  // A layer with no paint: the thumbnail shows the page's own background through it.
  graph.createNode('FRAME', page.id, { name: 'Empty', width: 40, height: 40, fills: [] })
  const png = expectDefined(renderThumbnail(ck, renderer, graph, page.id, 40, 40), 'png')
  const [r, g, b] = pixelInP3(png, 20, 20)
  expect(r).toBeGreaterThan(250)
  expect(g).toBeLessThan(5)
  expect(b).toBeLessThan(5)
})

const grain: NoiseEffect = {
  type: 'NOISE',
  color: P3_RED,
  visible: true,
  noise: { noiseType: 'MONOTONE', noiseSize: { x: 1, y: 1 }, density: 1 }
}

test('a noise effect hands the shader its color in the document profile', () => {
  const [r, g, b] = noiseUniformValues(grain, 'display-p3').primary
  // Display P3 red as extended sRGB, the components Skia converts into the document's space.
  expect(r).toBeCloseTo(1.0930, 3)
  expect(g).toBeCloseTo(-0.2267, 3)
  expect(b).toBeCloseTo(-0.1501, 3)
})

test('an sRGB document hands the shader the color as stored', () => {
  expect(noiseUniformValues(grain).primary).toEqual([1, 0, 0, 1])
})
