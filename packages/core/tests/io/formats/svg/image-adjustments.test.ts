import { afterAll, describe, expect, test } from 'bun:test'

import { SceneGraph, type ImageFilters } from '@pairdraw/scene-graph'
import { computeImageHash } from '@pairdraw/scene-graph/images'
import { toUint8Array } from 'js-base64'
import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '#core/canvas/renderer'
import { getCanvasKit } from '#core/canvaskit'
import { renderNodesToImage } from '#core/io/formats/raster/render'
import { exportPDFDocument } from '#core/io/formats/pdf'
import { renderNodesToLaidOutSVG } from '#core/io/formats/svg/text/layout'

const ck = await getCanvasKit()
// Exports bake through this renderer, as the app's do: the headless fallback would keep a
// renderer, and the font provider it shares, alive for the rest of the test process.
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1)))
afterAll(() => renderer.destroy())

/** The same 16-colour strip the canvas pixel test draws, so SVG and PNG can be compared. */
const COLORS: number[][] = [
  [0, 0, 0],
  [68, 68, 68],
  [136, 136, 136],
  [204, 204, 204],
  [255, 255, 255],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [204, 153, 0],
  [34, 221, 51],
  [102, 51, 170],
  [238, 119, 85],
  [17, 85, 136],
  [187, 221, 238],
  [85, 34, 17],
  [153, 187, 102]
]

const ALL_SEVEN: ImageFilters = {
  exposure: 0.25,
  contrast: 0.3,
  saturation: 0.4,
  temperature: -0.3,
  tint: 0.2,
  highlights: -0.4,
  shadows: 0.35
}

function scene(filters: ImageFilters) {
  const info = {
    width: COLORS.length,
    height: 1,
    alphaType: ck.AlphaType.Unpremul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB
  }
  const pixels = Uint8Array.from(COLORS.flatMap((color) => [...color, 255]))
  const source = expectDefined(ck.MakeImage(info, pixels, COLORS.length * 4), 'source image')
  const png = expectDefined(source.encodeToBytes(ck.ImageFormat.PNG, 100), 'source PNG')
  source.delete()
  const hash = computeImageHash(png)
  const graph = new SceneGraph()
  graph.images.set(hash, png)
  const pageId = graph.getPages()[0].id
  const layer = graph.createNode('RECTANGLE', pageId, {
    width: COLORS.length,
    height: 1,
    fills: [
      {
        type: 'IMAGE',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        imageHash: hash,
        imageScaleMode: 'FILL',
        filters
      }
    ]
  })
  return { graph, pageId, layerId: layer.id, hash, png }
}

/** The pixels of the PNG an SVG embeds in its image pattern. */
function embeddedPixels(svg: string): number[][] {
  const href = expectDefined(/href="data:image\/png;base64,([^"]+)"/.exec(svg), 'embedded PNG')[1]
  const bytes = toUint8Array(href)
  const image = expectDefined(ck.MakeImageFromEncoded(bytes), 'embedded image')
  const info = {
    width: COLORS.length,
    height: 1,
    alphaType: ck.AlphaType.Unpremul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB
  }
  const read = expectDefined(image.readPixels(0, 0, info), 'embedded pixels')
  image.delete()
  return COLORS.map((_, index) => Array.from(read.slice(index * 4, index * 4 + 3)))
}

function pngPixels(graph: SceneGraph, pageId: string, layerId: string): number[][] {
  const out = expectDefined(
    renderNodesToImage(ck, renderer, graph, pageId, [layerId], { scale: 1, format: 'PNG' }),
    'PNG export'
  )
  const image = expectDefined(ck.MakeImageFromEncoded(out), 'PNG image')
  const info = {
    width: COLORS.length,
    height: 1,
    alphaType: ck.AlphaType.Unpremul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB
  }
  const read = expectDefined(image.readPixels(0, 0, info), 'PNG pixels')
  image.delete()
  return COLORS.map((_, index) => Array.from(read.slice(index * 4, index * 4 + 3)))
}

describe('an adjusted image exported to SVG', () => {
  test('embeds the adjusted pixels, the same the PNG export draws', async () => {
    const { graph, pageId, layerId } = scene(ALL_SEVEN)
    const expected = pngPixels(graph, pageId, layerId)
    const svg = expectDefined(
      await renderNodesToLaidOutSVG(graph, pageId, [layerId], {}, ck, renderer),
      'SVG'
    )
    const embedded = embeddedPixels(svg)
    const worst = Math.max(
      ...embedded.flatMap((pixel, index) =>
        expected[index].map((value, c) => Math.abs(pixel[c] - value))
      )
    )
    expect(worst).toBeLessThanOrEqual(1)
  })

  test('embeds the original bytes when no adjustment is set', async () => {
    const { graph, pageId, layerId, png } = scene({})
    const svg = expectDefined(await renderNodesToLaidOutSVG(graph, pageId, [layerId]), 'SVG')
    const href = expectDefined(/href="data:image\/png;base64,([^"]+)"/.exec(svg), 'embedded PNG')[1]
    expect(toUint8Array(href)).toEqual(png)
  })
})

describe('an adjusted image exported to PDF', () => {
  test('embeds the adjusted pixels svg2pdf draws, not the untouched bytes', async () => {
    const { graph, pageId, layerId, png } = scene(ALL_SEVEN)
    const result = await exportPDFDocument(
      graph,
      [{ pageId, nodeIds: [layerId] }],
      { embedFonts: false },
      ck,
      renderer
    )
    const pdf = new TextDecoder('latin1').decode(expectDefined(result, 'PDF').data)
    expect(pdf).toContain('/Subtype /Image')
    // The adjusted PNG differs from the source; the PDF must carry the adjusted one.
    const sourceHex = Array.from(png.slice(0, 64), (b) => b.toString(16).padStart(2, '0')).join('')
    expect(pdf).not.toContain(sourceHex)
  })
})