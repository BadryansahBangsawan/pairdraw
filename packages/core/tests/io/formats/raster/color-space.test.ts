import { expect, test } from 'bun:test'

import type { ColorSpace, Image } from 'canvaskit-wasm'

import { expectDefined } from '#core-tests/helpers/assert'
import { buildP3BlendCells, P3_BLENDS, P3_CELL } from '#core-tests/helpers/display-p3'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit, renderNodesToImage } from '@pairdraw/core/io/formats/raster'
import { SceneGraph, type ColorProfile } from '@pairdraw/scene-graph'

const ck = await initCanvasKit()

function exported(space: ColorProfile) {
  const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1), 'surface'))
  try {
    const graph = new SceneGraph()
    graph.documentColorSpace = space
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      width: P3_BLENDS[0].modes.length * P3_CELL,
      height: P3_BLENDS.length * P3_CELL,
      fills: []
    })
    const cells = buildP3BlendCells(graph, frame.id)
    const png = expectDefined(
      renderNodesToImage(ck, renderer, graph, page.id, [frame.id], { scale: 1, format: 'PNG' }),
      'png'
    )
    return { cells, image: expectDefined(ck.MakeImageFromEncoded(png), 'image') }
  } finally {
    renderer.destroy()
  }
}

function components(image: Image, x: number, y: number, space: ColorSpace): number[] {
  const pixels = expectDefined(
    image.readPixels(Math.floor(x), Math.floor(y), {
      width: 1,
      height: 1,
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Unpremul,
      colorSpace: space
    }),
    'pixels'
  )
  return Array.from(pixels.subarray(0, 3))
}

test('a Display P3 document blends in its own components, as Figma exports it', () => {
  const { cells, image } = exported('display-p3')
  try {
    for (const { x, y, expected } of cells) {
      const actual = components(image, x, y, ck.ColorSpace.DISPLAY_P3)
      expected.forEach((channel, index) =>
        expect(Math.abs(actual[index] - channel)).toBeLessThanOrEqual(2)
      )
    }
  } finally {
    image.delete()
  }
})

test('the image carries the document profile', () => {
  for (const [space, isSRGB] of [
    ['display-p3', false],
    ['srgb', true]
  ] as const) {
    const { image } = exported(space)
    try {
      expect(ck.ColorSpace.Equals(image.getColorSpace(), ck.ColorSpace.SRGB)).toBe(isSRGB)
    } finally {
      image.delete()
    }
  }
})

test('an sRGB document keeps its components and blends them', () => {
  const { cells, image } = exported('srgb')
  try {
    const [normal, multiply] = cells
    const { source, backdrop } = P3_BLENDS[0]
    expect(components(image, normal.x, normal.y, ck.ColorSpace.SRGB)).toEqual(
      [source.r, source.g, source.b].map((channel) => Math.round(channel * 255))
    )
    const product = [source.r * backdrop.r, source.g * backdrop.g, source.b * backdrop.b]
    components(image, multiply.x, multiply.y, ck.ColorSpace.SRGB).forEach((channel, index) =>
      expect(Math.abs(channel - product[index] * 255)).toBeLessThanOrEqual(1)
    )
  } finally {
    image.delete()
  }
})
