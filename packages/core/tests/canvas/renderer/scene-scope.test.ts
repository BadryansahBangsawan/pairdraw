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

const BLUE = { r: 0.1, g: 0.2, b: 0.9 }
const RED = { r: 0.9, g: 0.1, b: 0.1 }

/** A page frame over which a page-level rectangle, drawn later, overlaps it. */
function overlappingPage() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    width: SIZE,
    height: SIZE,
    fills: [solid(BLUE)]
  })
  graph.createNode('RECTANGLE', page.id, { x: 10, y: 10, width: SIZE, height: SIZE, fills: [solid(RED)] })
  return { graph, page, frame }
}

function renderCenter(scopeId: string | null): number[] {
  const { graph, page } = overlappingPage()
  renderer.pageId = page.id
  renderer.panX = 0
  renderer.panY = 0
  renderer.zoom = 1
  renderer.viewportWidth = SIZE
  renderer.viewportHeight = SIZE
  renderer.sceneScopeId = scopeId
  const canvas = renderer.surface.getCanvas()
  canvas.clear(ck.TRANSPARENT)
  renderer.render(graph, new Set(), {}, 0, 'scene')
  renderer.surface.flush()
  const image = renderer.surface.makeImageSnapshot()
  try {
    const pixels = expectDefined(
      image.readPixels(SIZE / 2, SIZE / 2, {
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

function expectNear(actual: number[], expected: { r: number; g: number; b: number }) {
  const channels = [expected.r, expected.g, expected.b].map((channel) => Math.round(channel * 255))
  channels.forEach((channel, index) => expect(Math.abs(actual[index] - channel)).toBeLessThan(4))
}

test('the page draws every top-level layer, overlapping the frame', () => {
  expectNear(renderCenter(null), RED)
})

test('a scoped scene draws only the frame, clipped to it', () => {
  const { graph, page, frame } = overlappingPage()
  renderer.pageId = page.id
  renderer.panX = 0
  renderer.panY = 0
  renderer.zoom = 1
  renderer.viewportWidth = SIZE
  renderer.viewportHeight = SIZE
  renderer.sceneScopeId = frame.id
  const canvas = renderer.surface.getCanvas()
  canvas.clear(ck.TRANSPARENT)
  renderer.render(graph, new Set(), {}, 0, 'scene')
  renderer.surface.flush()
  const image = renderer.surface.makeImageSnapshot()
  try {
    const inside = expectDefined(
      image.readPixels(SIZE / 2, SIZE / 2, {
        width: 1,
        height: 1,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'inside pixels'
    )
    expectNear(Array.from(inside.subarray(0, 4)), BLUE)
    // The red rectangle starts inside the frame; its part past the frame is clipped away.
    const outside = expectDefined(
      image.readPixels(SIZE - 1, SIZE - 1, {
        width: 1,
        height: 1,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'outside pixels'
    )
    expect(Array.from(outside.subarray(0, 4)).slice(0, 3)).not.toEqual([230, 26, 26])
  } finally {
    image.delete()
  }
})
