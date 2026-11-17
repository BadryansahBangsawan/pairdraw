import { afterAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { runTool, setupToolTest } from '#core-tests/helpers/tools'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'

const WIDTH = 320
const HEIGHT = 200

const CARD = `<Frame name="Card" w={160} h={80} bg="#2244aa" effects={[{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.35 }, radius: 16, spread: 0, visible: true, blendMode: "NORMAL" }]} />`
const MARK = `<Frame name="Mark" x={220} y={30} w={40} h={40} bg="#ff0000" />`

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(WIDTH, HEIGHT), 'surface'))
afterAll(() => renderer.destroy())

function createdId(result: unknown): string {
  if (
    result !== null &&
    typeof result === 'object' &&
    'id' in result &&
    typeof result.id === 'string'
  ) {
    return result.id
  }
  throw new Error('render did not create a node')
}

function pixel(x: number, y: number): { r: number; g: number; b: number } {
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

describe('render tool effects', () => {
  test('a drop shadow written without an offset still draws, and so does the layer beside it', async () => {
    const { graph, figma } = setupToolTest()
    const cardId = createdId(await runTool(figma, 'render', { jsx: CARD }))
    const markId = createdId(await runTool(figma, 'render', { jsx: MARK }))
    const card = expectDefined(graph.getNode(cardId), 'card')
    const mark = expectDefined(graph.getNode(markId), 'mark')
    expect(mark.x).toBe(220)
    expect(mark.y).toBe(30)

    const page = expectDefined(graph.getPages()[0], 'page')
    renderer.viewportWidth = WIDTH
    renderer.viewportHeight = HEIGHT
    renderer.pageId = page.id
    renderer.render(graph, new Set(), {}, 1, 'scene')

    expect(card.effects[0]).toMatchObject({
      type: 'DROP_SHADOW',
      offset: { x: 0, y: 4 },
      radius: 16
    })
    const markPixel = pixel(230, 40)
    expect(markPixel.r).toBeGreaterThan(250)
    expect(markPixel.g).toBeLessThan(5)
    expect(markPixel.b).toBeLessThan(5)

    const fill = pixel(Math.round(card.x + 40), Math.round(card.y + 40))
    expect(fill.r).toBeGreaterThan(20)
    expect(fill.r).toBeLessThan(50)
    expect(fill.g).toBeGreaterThan(50)
    expect(fill.g).toBeLessThan(90)
    expect(fill.b).toBeGreaterThan(150)
    expect(fill.b).toBeLessThan(190)

    const shadow = pixel(Math.round(card.x + 80), Math.round(card.y + card.height + 8))
    expect(shadow.r).toBeLessThan(230)
    expect(shadow.g).toBeLessThan(230)
    expect(shadow.b).toBeLessThan(230)
  })
})
