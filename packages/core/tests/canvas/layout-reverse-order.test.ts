import { afterAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'

const SIZE = 40

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(SIZE, SIZE), 'surface'))
afterAll(() => renderer.destroy())

const RED = { r: 0.9, g: 0.1, b: 0.1 }
const BLUE = { r: 0.1, g: 0.2, b: 0.9 }

function solid(color: { r: number; g: number; b: number }): Fill {
  return { type: 'SOLID', color: { ...color, a: 1 }, opacity: 1, visible: true, blendMode: 'NORMAL' }
}

/** Two 40 px squares on top of each other inside an auto layout frame, the second drawn last. */
function overlapped(reverse: boolean): SceneGraph {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    width: SIZE,
    height: SIZE,
    layoutMode: 'HORIZONTAL',
    primaryAxisSizing: 'FIXED',
    counterAxisSizing: 'FIXED',
    itemReverseZIndex: reverse
  })
  for (const fill of [RED, BLUE])
    graph.createNode('RECTANGLE', frame.id, {
      width: SIZE,
      height: SIZE,
      layoutPositioning: 'ABSOLUTE',
      fills: [solid(fill)]
    })
  return graph
}

function centerPixel(graph: SceneGraph): number[] {
  const page = graph.getPages()[0]
  renderer.pageId = page.id
  const canvas = renderer.surface.getCanvas()
  canvas.clear(ck.TRANSPARENT)
  renderer.renderSceneToCanvas(canvas, graph, page.id)
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

describe('reverse z-index', () => {
  test('draws the last layer in front by default', () => {
    const [r, , b] = centerPixel(overlapped(false))
    expect(b).toBeGreaterThan(r)
  })

  test('draws the first layer in front of an auto layout frame that reverses them', () => {
    const [r, , b] = centerPixel(overlapped(true))
    expect(r).toBeGreaterThan(b)
  })
})
