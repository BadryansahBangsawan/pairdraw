import { afterAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { SceneGraph } from '@pairdraw/scene-graph'

const WIDTH = 320
const HEIGHT = 200

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(WIDTH, HEIGHT), 'surface'))
afterAll(() => renderer.destroy())

function sample(x: number, y: number): { r: number; g: number; b: number } {
  renderer.surface.flush()
  const image = renderer.surface.makeImageSnapshot()
  try {
    const rgba = expectDefined(
      image.readPixels(0, 0, {
        width: WIDTH,
        height: HEIGHT,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'pixels'
    )
    const index = (y * WIDTH + x) * 4
    return { r: rgba[index] ?? 0, g: rgba[index + 1] ?? 0, b: rgba[index + 2] ?? 0 }
  } finally {
    image.delete()
  }
}

describe('a layer whose paint throws', () => {
  test('skips that layer, keeps the one beside it, and reports each distinct failure once', () => {
    const graph = new SceneGraph()
    const page = expectDefined(graph.getPages()[0], 'page')
    const card = graph.createNode('FRAME', page.id, {
      name: 'Card',
      x: 40,
      y: 20,
      width: 160,
      height: 80,
      opacity: 0.5,
      fills: [
        { type: 'SOLID', color: { r: 0.13, g: 0.27, b: 0.67, a: 1 }, opacity: 1, visible: true }
      ],
      effects: [
        {
          type: 'LAYER_BLUR',
          color: { r: 0, g: 0, b: 0, a: 0 },
          offset: { x: 0, y: 0 },
          radius: 8,
          spread: 0,
          visible: true
        }
      ]
    })
    graph.createNode('RECTANGLE', page.id, {
      name: 'Mark',
      x: 80,
      y: 20,
      width: 40,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    renderer.viewportWidth = WIDTH
    renderer.viewportHeight = HEIGHT
    renderer.zoom = 2
    renderer.pageId = page.id
    const reports: string[] = []
    renderer.onNodeDrawFailure = (nodeId, error) => {
      const message = error instanceof Error ? error.message : String(error)
      reports.push(`${nodeId}\0${message}`)
    }
    const drawNodeFill = renderer.drawNodeFill
    let failure = 'paint failed'
    renderer.drawNodeFill = (canvas, node, fill) => {
      if (node.id === card.id) throw new Error(failure)
      drawNodeFill.call(renderer, canvas, node, fill)
    }
    try {
      renderer.render(graph, new Set(), {}, 1, 'scene')
      renderer.render(graph, new Set(), {}, 2, 'scene')
      const first = reports.length
      failure = 'paint failed again'
      renderer.render(graph, new Set(), {}, 3, 'scene')
      expect(first).toBe(1)
      expect(reports).toHaveLength(2)
      expect(reports[0]).not.toBe(reports[1])
    } finally {
      Reflect.deleteProperty(renderer, 'drawNodeFill')
      renderer.onNodeDrawFailure = null
      renderer.zoom = 1
    }

    const mark = sample(170, 50)
    expect(mark.r).toBeGreaterThan(250)
    expect(mark.g).toBeLessThan(5)
    expect(mark.b).toBeLessThan(5)
  })
})
