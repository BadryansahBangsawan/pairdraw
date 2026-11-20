import { beforeAll, describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { initCanvasKit } from '@pairdraw/core/io/formats/raster'

import { SkiaRenderer } from '#core/canvas'
import { TiledSceneController } from '#core/canvas/renderer/tiles'
import { expectDefined } from '#core-tests/helpers/assert'

let ck: Awaited<ReturnType<typeof initCanvasKit>>

beforeAll(async () => {
  ck = await initCanvasKit()
})

describe('tiled scene page colour', () => {
  test('repaints cached tiles when the page colour changes without an edit', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('RECTANGLE', page.id, {
      x: 40,
      y: 40,
      width: 60,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    const surface = expectDefined(ck.MakeSurface(256, 256), 'surface')
    const renderer = new SkiaRenderer(ck, surface)
    const controller = new TiledSceneController()
    const canvas = surface.getCanvas()
    const colorAtCorner = () => {
      const pixels = expectDefined(
        canvas.readPixels(0, 0, {
          width: 8,
          height: 8,
          colorType: ck.ColorType.RGBA_8888,
          alphaType: ck.AlphaType.Unpremul,
          colorSpace: ck.ColorSpace.SRGB
        }),
        'pixels'
      )
      return Array.from(pixels.slice(0, 4))
    }
    try {
      renderer.pageId = page.id
      renderer.zoom = 1
      renderer.dpr = 1
      renderer.panX = 0
      renderer.panY = 0
      renderer.viewportWidth = 256
      renderer.viewportHeight = 256
      renderer.pageColor = { r: 1, g: 1, b: 1, a: 1 }
      let frame = controller.renderFrame(renderer, canvas, graph, 1, 0)
      for (let frameIndex = 0; frame.pending && frameIndex < 100; frameIndex++) {
        frame = controller.renderFrame(renderer, canvas, graph, 1, 0)
      }
      expect(frame.covered).toBeTrue()
      expect(colorAtCorner()).toEqual([255, 255, 255, 255])

      renderer.pageColor = { r: 0, g: 0, b: 0, a: 1 }
      frame = controller.renderFrame(renderer, canvas, graph, 1, 0)
      for (let frameIndex = 0; frame.pending && frameIndex < 100; frameIndex++) {
        frame = controller.renderFrame(renderer, canvas, graph, 1, 0)
      }
      expect(colorAtCorner()).toEqual([0, 0, 0, 255])
    } finally {
      controller.destroy()
      renderer.destroy()
    }
  })
})
