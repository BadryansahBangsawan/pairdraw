import { describe, expect, mock, test } from 'bun:test'
import type { Canvas, Path } from 'canvaskit-wasm'

import type { SceneNode, SceneGraph, VectorSegment, VectorVertex } from '@pairdraw/scene-graph'

import { drawRegionHatch } from '#core/canvas/region-hatch'
import { SkiaRenderer } from '#core/canvas/renderer'
import { initCanvasKit } from '#core/io/formats/raster/headless'
import { expectDefined } from '#core-tests/helpers/assert'

const ck = await initCanvasKit()
const zero = { x: 0, y: 0 }

/**
 * The hatch reaches a canvas through four calls, and the case only reads back the clip it sets, so
 * a stand-in for those keeps the real renderer and CanvasKit paths everywhere else.
 */
function asCanvas(double: object): Canvas {
  return double as Canvas
}

/** The hatch is clipped to its region, which is the only drawing this reads back. */
function clipPathOf(zoom: number, cornerRadius: number): Path {
  const surface = expectDefined(ck.MakeSurface(400, 400), 'surface')
  const renderer = new SkiaRenderer(ck, surface)
  renderer.zoom = zoom
  renderer.viewportWidth = 400
  renderer.viewportHeight = 400
  let clipped: Path | null = null
  const canvas = asCanvas({
    save: mock(),
    restore: mock(),
    drawLine: mock(),
    clipPath: (path: Path) => {
      clipped = path.copy()
    }
  })
  const node = { id: 'vector', x: 0, y: 0, rotation: 0 } as SceneNode
  const graph = { getNode: (id: string) => (id === 'vector' ? node : undefined) } as SceneGraph
  const vertices: VectorVertex[] = [
    { x: 0, y: 0, cornerRadius },
    { x: 100, y: 0, cornerRadius },
    { x: 100, y: 100, cornerRadius },
    { x: 0, y: 100, cornerRadius }
  ]
  const segments: VectorSegment[] = [
    { start: 0, end: 1, tangentStart: zero, tangentEnd: zero },
    { start: 1, end: 2, tangentStart: zero, tangentEnd: zero },
    { start: 2, end: 3, tangentStart: zero, tangentEnd: zero },
    { start: 3, end: 0, tangentStart: zero, tangentEnd: zero }
  ]

  drawRegionHatch(renderer, canvas, graph, {
    nodeId: 'vector',
    vertices,
    segments,
    regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }],
    selectedRegions: new Set([0]),
    selectedVertexIndices: new Set<number>(),
    hoveredRegion: null
  })
  renderer.destroy()
  const copy = expectDefined(clipped, 'clip path')
  return copy
}

describe('the region hatch', () => {
  test('rounds a point’s own corner radius at the zoom its points are drawn at', () => {
    // 100-unit square at 2×: 200 screen pixels, each corner cut by 10 units, so 20 pixels. A point
    // p pixels inside a corner sits in the fill only when p ≥ 0.293 × radius, so (4, 4) is outside
    // at the 20-pixel radius the zoom asks for and inside at the world-sized 10.
    const path = clipPathOf(2, 10)

    expect(path.contains(4, 4)).toBe(false)
    expect(path.contains(6, 6)).toBe(true)
  })
})
