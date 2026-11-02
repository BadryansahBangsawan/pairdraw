import { afterEach, beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@open-pencil/core'
import { initCanvasKit } from '@open-pencil/core/io/formats/raster'
import { SceneGraph, type Effect, type Fill } from '@open-pencil/scene-graph'

import { SkiaRenderer } from '#core/canvas'

const WIDTH = 120
const HEIGHT = 60
/** Where the backdrop turns from black to white, under the blurring layer. */
const EDGE = 60

let ck: Awaited<ReturnType<typeof initCanvasKit>>
const renderers: SkiaRenderer[] = []

beforeAll(async () => {
  ck = await initCanvasKit()
})

afterEach(() => {
  for (const renderer of renderers.splice(0)) renderer.destroy()
})

function solid(r: number, g: number, b: number): Fill {
  return { type: 'SOLID', color: { r, g, b, a: 1 }, opacity: 1, visible: true }
}

const DROP_SHADOW: Effect = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.5 },
  offset: { x: 0, y: 4 },
  radius: 4,
  spread: 0,
  visible: true
}

const BACKGROUND_BLUR: Effect = {
  type: 'BACKGROUND_BLUR',
  color: { r: 0, g: 0, b: 0, a: 0 },
  offset: { x: 0, y: 0 },
  radius: 16,
  spread: 0,
  visible: true
}

/** A black and a white half, with a clear layer blurring what is behind it across the edge. */
function blurredEdge() {
  const graph = new SceneGraph()
  const page = expectDefined(graph.getPages()[0], 'page')
  graph.createNode('RECTANGLE', page.id, { width: EDGE, height: HEIGHT, fills: [solid(0, 0, 0)] })
  graph.createNode('RECTANGLE', page.id, {
    x: EDGE,
    width: WIDTH - EDGE,
    height: HEIGHT,
    fills: [solid(1, 1, 1)]
  })
  const blur = graph.createNode('RECTANGLE', page.id, {
    x: 20,
    y: 10,
    width: 80,
    height: 40,
    fills: [],
    effects: [BACKGROUND_BLUR, DROP_SHADOW]
  })
  return { graph, pageId: page.id, blurId: blur.id }
}

function createRenderer(pageId: string, reducedEffects: boolean): SkiaRenderer {
  const renderer = new SkiaRenderer(
    ck,
    expectDefined(ck.MakeSurface(WIDTH, HEIGHT), 'reduced effects surface')
  )
  renderers.push(renderer)
  renderer.viewportWidth = WIDTH
  renderer.viewportHeight = HEIGHT
  renderer.pageId = pageId
  renderer.pageColor = { r: 1, g: 1, b: 1, a: 1 }
  renderer.zoom = 1
  renderer.dpr = 1
  renderer.reducedEffects = reducedEffects
  return renderer
}

function snapshot(renderer: SkiaRenderer): Uint8Array {
  renderer.surface.flush()
  const image = renderer.surface.makeImageSnapshot()
  try {
    return expectRgbaPixels(
      image.readPixels(0, 0, {
        width: WIDTH,
        height: HEIGHT,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'reduced effects pixels'
    )
  } finally {
    image.delete()
  }
}

/** Draws the page as an export does, with every effect. */
function exportPixels(renderer: SkiaRenderer, graph: SceneGraph, pageId: string): Uint8Array {
  const canvas = renderer.surface.getCanvas()
  canvas.clear(ck.WHITE)
  renderer.renderSceneToCanvas(canvas, graph, pageId)
  return snapshot(renderer)
}

/** Draws the page as the canvas does, through the uncached scene path. */
function canvasPixels(renderer: SkiaRenderer, graph: SceneGraph): Uint8Array {
  renderer.render(graph, new Set(), {}, -1, 'scene')
  return snapshot(renderer)
}

/** The red channel just left of the edge: black when sharp, lifted when the white half blurs in. */
function leftOfEdge(pixels: Uint8Array): number {
  return pixels[(30 * WIDTH + EDGE - 2) * 4]
}

describe('reduced effects', () => {
  test('the canvas leaves out a background blur', () => {
    const { graph, pageId } = blurredEdge()
    expect(leftOfEdge(canvasPixels(createRenderer(pageId, false), graph))).toBeGreaterThan(40)
    expect(leftOfEdge(canvasPixels(createRenderer(pageId, true), graph))).toBeLessThan(10)
  })

  test('an export still draws the background blur, and the canvas stays cheap after it', () => {
    const { graph, pageId, blurId } = blurredEdge()
    const full = exportPixels(createRenderer(pageId, false), graph, pageId)
    const renderer = createRenderer(pageId, true)

    // The canvas draws first, so an export must not replay what it recorded.
    expect(leftOfEdge(canvasPixels(renderer, graph))).toBeLessThan(10)
    const exported = exportPixels(renderer, graph, pageId)
    expect(leftOfEdge(exported)).toBeGreaterThan(40)
    expect(Math.abs(leftOfEdge(exported) - leftOfEdge(full))).toBeLessThan(3)
    expect(renderer.drawingFullEffects).toBe(false)
    expect(renderer.nodePictureCache.has(blurId)).toBe(false)

    expect(leftOfEdge(canvasPixels(renderer, graph))).toBeLessThan(10)
  })

  test('an export restores reduced effects when drawing fails', () => {
    const { graph, pageId } = blurredEdge()
    const renderer = createRenderer(pageId, true)
    renderer.renderNode = () => {
      expect(renderer.effectsReduced).toBe(false)
      throw new Error('drawing failed')
    }
    expect(() => renderer.renderSceneToCanvas(renderer.surface.getCanvas(), graph, pageId)).toThrow(
      'drawing failed'
    )
    expect(renderer.effectsReduced).toBe(true)
  })

  test('shadows keep their drop shadow on a reduced-effects canvas', () => {
    const graph = new SceneGraph()
    const page = expectDefined(graph.getPages()[0], 'page')
    graph.createNode('RECTANGLE', page.id, {
      x: 20,
      y: 10,
      width: 80,
      height: 30,
      fills: [solid(1, 1, 1)],
      effects: [DROP_SHADOW]
    })
    const under = (pixels: Uint8Array) => pixels[(42 * WIDTH + 60) * 4]
    expect(under(canvasPixels(createRenderer(page.id, true), graph))).toBeLessThan(220)
  })
})

describe('pixel ratio cap', () => {
  test('the editor draws at the display ratio, at most the canvas cap', () => {
    const editor = createEditor()
    const renderer = createRenderer(editor.state.currentPageId, false)
    const draw = () =>
      renderer.renderFromEditorState(
        editor.state,
        editor.graph,
        null,
        WIDTH,
        HEIGHT,
        false,
        'scene'
      )

    // Headless, the display ratio is 1.
    draw()
    expect(renderer.dpr).toBe(1)
    renderer.maxPixelRatio = 0.5
    draw()
    expect(renderer.dpr).toBe(0.5)
  })
})

/** Pixels read back as 8-bit RGBA, failing when the surface returned none or another format. */
function expectRgbaPixels(pixels: Float32Array | Uint8Array | null, label: string): Uint8Array {
  if (!(pixels instanceof Uint8Array)) throw new TypeError(`${label} were expected to be 8-bit RGBA`)
  return pixels
}
