import { afterAll, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'

const SIZE = 40

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(SIZE, SIZE), 'surface'))
afterAll(() => renderer.destroy())

function solid(color: { r: number; g: number; b: number }): Fill {
  return { type: 'SOLID', color: { ...color, a: 1 }, opacity: 1, visible: true, blendMode: 'NORMAL' }
}

const RED = { r: 0.9, g: 0.1, b: 0.1 }

/** A page-level ellipse mask behind a rectangle, as Use as mask leaves on the page. */
function pageMaskScene() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('RECTANGLE', page.id, { width: SIZE, height: SIZE, fills: [solid(RED)] })
  const mask = graph.createNode('ELLIPSE', page.id, {
    width: SIZE,
    height: SIZE,
    fills: [solid({ r: 0.1, g: 0.2, b: 0.9 })],
    isMask: true
  })
  graph.insertChildAt(mask.id, page.id, 0)
  return { graph, page }
}

function pixelAt(x: number, y: number): number[] {
  const { graph, page } = pageMaskScene()
  renderer.pageId = page.id
  renderer.panX = 0
  renderer.panY = 0
  renderer.zoom = 1
  renderer.viewportWidth = SIZE
  renderer.viewportHeight = SIZE
  const canvas = renderer.surface.getCanvas()
  canvas.clear(ck.TRANSPARENT)
  renderer.render(graph, new Set(), {}, 0, 'scene')
  renderer.surface.flush()
  const image = renderer.surface.makeImageSnapshot()
  try {
    const pixels = expectDefined(
      image.readPixels(x, y, {
        width: 1,
        height: 1,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'pixels'
    )
    return Array.from(pixels.subarray(0, 4))
  } finally {
    image.delete()
  }
}

test('a page-level mask clips the page layers above it', () => {
  // Inside the ellipse, the rectangle shows through the mask.
  const center = pixelAt(SIZE / 2, SIZE / 2)
  expect(center[0]).toBeGreaterThan(200)
  expect(center[1]).toBeLessThan(80)

  // The corner lies outside the ellipse mask, so the rectangle above it is clipped away and the
  // page shows through; the red rectangle's green channel is near zero.
  const corner = pixelAt(1, 1)
  expect(corner[1]).toBeGreaterThan(200)
})
