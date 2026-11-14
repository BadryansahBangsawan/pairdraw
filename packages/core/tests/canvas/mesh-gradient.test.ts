import { expect, test } from 'bun:test'

import type { Fill, Stroke } from '@pairdraw/scene-graph'
import { SceneGraph } from '@pairdraw/scene-graph'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'

import { expectDefined } from '#core-tests/helpers/assert'

/** A 1x1 mesh: red top-left, green bottom-right, blue the other corners. */
function meshFill(): Fill {
  return {
    type: 'MESH',
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    meshColumns: 1,
    meshRows: 1,
    meshPoints: [
      { position: { x: 0, y: 0 }, color: { r: 1, g: 0, b: 0, a: 1 } },
      { position: { x: 1, y: 0 }, color: { r: 0, g: 0, b: 1, a: 1 } },
      { position: { x: 0, y: 1 }, color: { r: 0, g: 0, b: 1, a: 1 } },
      { position: { x: 1, y: 1 }, color: { r: 0, g: 1, b: 0, a: 1 } }
    ]
  }
}

test('a mesh triangulates its grid into vertex colors', async () => {
  const ck = await initCanvasKit()
  const size = 101
  const surface = expectDefined(ck.MakeSurface(size, size), 'surface')
  try {
    const renderer = new SkiaRenderer(ck, surface)
    const graph = new SceneGraph()
    const page = expectDefined(graph.getPages()[0], 'page')
    const node = graph.createNode('RECTANGLE', page.id, { width: size, height: size, fills: [meshFill()] })
    const canvas = surface.getCanvas()
    canvas.clear(ck.TRANSPARENT)
    renderer.renderShape(canvas, node, graph)
    surface.flush()
    const image = surface.makeImageSnapshot()
    try {
      const pixels = expectDefined(
        image.readPixels(0, 0, {
          width: size,
          height: size,
          colorType: ck.ColorType.RGBA_8888,
          alphaType: ck.AlphaType.Unpremul,
          colorSpace: ck.ColorSpace.SRGB
        }),
        'pixels'
      )
      const at = (x: number, y: number) => {
        const offset = (y * size + x) * 4
        return { r: pixels[offset] ?? 0, g: pixels[offset + 1] ?? 0, b: pixels[offset + 2] ?? 0 }
      }
      // Corners carry their point's color; the middle sits on the shared diagonal of two blue
      // corners, so it is blue; a point inside one triangle blends red and blue.
      expect(at(0, 0).r).toBeGreaterThan(200)
      expect(at(size - 1, size - 1).g).toBeGreaterThan(200)
      const middle = at(50, 50)
      expect(middle.b).toBeGreaterThan(200)
      expect(middle.r).toBeLessThan(60)
      const quarter = at(25, 25)
      expect(quarter.r).toBeGreaterThan(40)
      expect(quarter.b).toBeGreaterThan(40)
    } finally {
      image.delete()
    }
  } finally {
    surface.dispose()
  }
})

test('an incomplete mesh falls back instead of drawing', async () => {
  const ck = await initCanvasKit()
  const surface = expectDefined(ck.MakeSurface(11, 11), 'surface')
  try {
    const renderer = new SkiaRenderer(ck, surface)
    const graph = new SceneGraph()
    const page = expectDefined(graph.getPages()[0], 'page')
    const fill = meshFill()
    fill.meshPoints = fill.meshPoints?.slice(0, 3)
    const node = graph.createNode('RECTANGLE', page.id, { width: 11, height: 11, fills: [fill] })
    const canvas = surface.getCanvas()
    canvas.clear(ck.TRANSPARENT)
    renderer.renderShape(canvas, node, graph)
    surface.flush()
    const image = surface.makeImageSnapshot()
    try {
      const pixels = expectDefined(
        image.readPixels(0, 0, {
          width: 11,
          height: 11,
          colorType: ck.ColorType.RGBA_8888,
          alphaType: ck.AlphaType.Unpremul,
          colorSpace: ck.ColorSpace.SRGB
        }),
        'pixels'
      )
      // Nothing drew: the fill's own color is black but every pixel stays transparent.
      expect(pixels[3]).toBe(0)
    } finally {
      image.delete()
    }
  } finally {
    surface.dispose()
  }
})
test('a mesh stroke paints the outline with the grid', async () => {
  const ck = await initCanvasKit()
  const size = 101
  const surface = expectDefined(ck.MakeSurface(size, size), 'surface')
  try {
    const renderer = new SkiaRenderer(ck, surface)
    const graph = new SceneGraph()
    const page = expectDefined(graph.getPages()[0], 'page')
    const stroke: Stroke = { ...meshFill(), opacity: 1, weight: 10, align: 'CENTER' }
    const node = graph.createNode('RECTANGLE', page.id, {
      width: size,
      height: size,
      fills: [],
      strokes: [stroke],
      strokeWeight: 10
    })
    const canvas = surface.getCanvas()
    canvas.clear(ck.TRANSPARENT)
    renderer.renderShape(canvas, node, graph)
    surface.flush()
    const image = surface.makeImageSnapshot()
    try {
      const pixels = expectDefined(
        image.readPixels(0, 0, {
          width: size,
          height: size,
          colorType: ck.ColorType.RGBA_8888,
          alphaType: ck.AlphaType.Unpremul,
          colorSpace: ck.ColorSpace.SRGB
        }),
        'pixels'
      )
      // On the outer left edge the grid blends red and blue; the middle stays empty.
      const edge = (0 * size + 50) * 4
      expect(pixels[edge] ?? 0).toBeGreaterThan(80)
      expect(pixels[edge + 2] ?? 0).toBeGreaterThan(80)
      expect(pixels[(50 * size + 50) * 4 + 3] ?? 1).toBe(0)
    } finally {
      image.delete()
    }
  } finally {
    surface.dispose()
  }
})
