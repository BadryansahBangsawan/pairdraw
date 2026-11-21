import { afterAll, describe, expect, test } from 'bun:test'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { createPlayScenes, snapshotPlayFrame, startSession } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'

import { expectDefined } from '../helpers/assert'

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1)))
afterAll(() => renderer.destroy())

const solid = (r: number, g: number, b: number) => ({
  type: 'SOLID' as const,
  color: { r, g, b, a: 1 },
  opacity: 1,
  visible: true
})

// An effect makes the renderer keep a picture of the layer by its id, which a switch must replace.
const blur = {
  type: 'BACKGROUND_BLUR' as const,
  color: { r: 0, g: 0, b: 0, a: 0 },
  offset: { x: 0, y: 0 },
  radius: 2,
  spread: 0,
  visible: true,
  blendMode: 'NORMAL' as const
}

/** A white 100×100 screen holding a red Off instance that a click changes to the green On. */
function screen() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { y: 500 })
  const variant = (name: string, fill: ReturnType<typeof solid>) =>
    graph.createNode('COMPONENT', set.id, {
      name,
      width: 60,
      height: 60,
      fills: [fill],
      effects: [blur]
    })
  const off = variant('State=Off', solid(1, 0, 0))
  const on = variant('State=On', solid(0, 1, 0))
  const frame = graph.createNode('FRAME', pageId, {
    width: 100,
    height: 100,
    fills: [solid(1, 1, 1)]
  })
  const instance = expectDefined(graph.createInstance(off.id, frame.id, { x: 10, y: 10 }))
  const reaction: PrototypeReaction['actions'][number] = {
    type: 'NODE',
    nodeId: on.id,
    navigation: 'CHANGE_TO',
    transition: { type: 'INSTANT', duration: 0 },
    overlayPosition: 'CENTER'
  }
  return { graph, frame, instance, reaction }
}

/** The colour at (x, y) once the frame is drawn with these play scenes, as [r, g, b]. */
function colorAt(
  graph: SceneGraph,
  frameId: string,
  scenes: ReturnType<typeof createPlayScenes> | undefined,
  x: number,
  y: number
): number[] {
  const surface = expectDefined(ck.MakeSurface(100, 100))
  try {
    renderer.worldViewport = { x: -1e6, y: -1e6, w: 2e6, h: 2e6 }
    renderer.renderNode(surface.getCanvas(), graph, frameId, {
      playing: true,
      playScenes: scenes?.views,
      playScroll: scenes?.scroll
    })
    surface.flush()
    const image = surface.makeImageSnapshot()
    const pixels = expectDefined(
      image.readPixels(x, y, {
        width: 1,
        height: 1,
        alphaType: ck.AlphaType.Unpremul,
        colorType: ck.ColorType.RGBA_8888,
        colorSpace: ck.ColorSpace.SRGB
      })
    )
    image.delete()
    return [pixels[0], pixels[1], pixels[2]]
  } finally {
    surface.delete()
  }
}

describe('a frame play changed', () => {
  test('draws from its copy, then from the document again once play lets it go', () => {
    const { graph, frame, instance, reaction } = screen()
    const scenes = createPlayScenes(() => graph)
    // The document's red instance is drawn, and its picture kept, first.
    expect(colorAt(graph, frame.id, scenes, 40, 40)).toEqual([255, 0, 0])

    scenes.run(startSession(frame.id), {
      sourceId: instance.id,
      action: reaction,
      transition: null
    })
    expect(colorAt(graph, frame.id, scenes, 40, 40)).toEqual([0, 255, 0])

    scenes.clear()
    expect(colorAt(graph, frame.id, scenes, 40, 40)).toEqual([255, 0, 0])
  })
})

describe('a frame play scrolled', () => {
  test('draws its content moved by the offset, inside its clip', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      fills: [solid(1, 1, 1)]
    })
    const list = graph.createNode('FRAME', frame.id, {
      y: 20,
      width: 100,
      height: 40,
      clipsContent: true,
      overflowDirection: 'VERTICAL',
      fills: []
    })
    graph.createNode('RECTANGLE', list.id, { width: 100, height: 40, fills: [solid(1, 0, 0)] })
    graph.createNode('RECTANGLE', list.id, {
      y: 40,
      width: 100,
      height: 40,
      fills: [solid(0, 0, 1)]
    })
    const scenes = createPlayScenes(() => graph)
    expect(colorAt(graph, frame.id, scenes, 50, 30)).toEqual([255, 0, 0])

    scenes.scrollBy(frame.id, [frame.id, list.id], 0, 40)
    expect(colorAt(graph, frame.id, scenes, 50, 30)).toEqual([0, 0, 255])
    // The red row moved above the list, where the list clips it away.
    expect(colorAt(graph, frame.id, scenes, 50, 10)).toEqual([255, 255, 255])
  })

  test('keeps fixed and sticky layers in place over scrolled content', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      fills: [solid(1, 1, 1)]
    })
    const list = graph.createNode('FRAME', frame.id, {
      width: 100,
      height: 100,
      clipsContent: true,
      overflowDirection: 'VERTICAL',
      fills: []
    })
    graph.createNode('RECTANGLE', list.id, { width: 100, height: 200, fills: [solid(1, 0, 0)] })
    graph.createNode('RECTANGLE', list.id, {
      width: 50,
      height: 10,
      fills: [solid(0, 0, 1)],
      scrollBehavior: 'FIXED'
    })
    graph.createNode('RECTANGLE', list.id, {
      x: 50,
      width: 50,
      height: 10,
      y: 60,
      fills: [solid(0, 1, 0)],
      scrollBehavior: 'STICKY_SCROLLS'
    })
    const scenes = createPlayScenes(() => graph)
    scenes.scrollBy(frame.id, [frame.id, list.id], 0, 100)
    expect(colorAt(graph, frame.id, scenes, 20, 5)).toEqual([0, 0, 255])
    expect(colorAt(graph, frame.id, scenes, 70, 5)).toEqual([0, 255, 0])
    expect(colorAt(graph, frame.id, scenes, 70, 60)).toEqual([255, 0, 0])
  })

  test('draws fixed and sticky layers above the content that scrolls under them', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      fills: [solid(1, 1, 1)]
    })
    const list = graph.createNode('FRAME', frame.id, {
      width: 100,
      height: 100,
      clipsContent: true,
      overflowDirection: 'VERTICAL',
      fills: []
    })
    // The header comes first in the layer list, the content after it, as a person builds a screen.
    graph.createNode('RECTANGLE', list.id, {
      width: 50,
      height: 10,
      fills: [solid(0, 0, 1)],
      scrollBehavior: 'FIXED'
    })
    graph.createNode('RECTANGLE', list.id, {
      x: 50,
      width: 50,
      height: 10,
      y: 60,
      fills: [solid(0, 1, 0)],
      scrollBehavior: 'STICKY_SCROLLS'
    })
    graph.createNode('RECTANGLE', list.id, { width: 100, height: 200, fills: [solid(1, 0, 0)] })
    const scenes = createPlayScenes(() => graph)
    scenes.scrollBy(frame.id, [frame.id, list.id], 0, 100)
    expect(colorAt(graph, frame.id, scenes, 20, 5)).toEqual([0, 0, 255])
    expect(colorAt(graph, frame.id, scenes, 70, 5)).toEqual([0, 255, 0])
    expect(colorAt(graph, frame.id, scenes, 70, 60)).toEqual([255, 0, 0])
  })
})

/** The colour at (x, y) of a PNG, as [r, g, b]. */
function pngColorAt(png: Uint8Array, x: number, y: number): number[] {
  const image = expectDefined(ck.MakeImageFromEncoded(png))
  try {
    const pixels = expectDefined(
      image.readPixels(x, y, {
        width: 1,
        height: 1,
        alphaType: ck.AlphaType.Unpremul,
        colorType: ck.ColorType.RGBA_8888,
        colorSpace: ck.ColorSpace.SRGB
      })
    )
    return [pixels[0], pixels[1], pixels[2]]
  } finally {
    image.delete()
  }
}

describe('the frame a dissolve starts from', () => {
  test("draws play's copy, and leaves the canvas it borrowed drawing the document", () => {
    const { graph, frame, instance, reaction } = screen()
    const scenes = createPlayScenes(() => graph)
    // An editing canvas drew the document first and keeps its picture of the red instance.
    expect(colorAt(graph, frame.id, undefined, 40, 40)).toEqual([255, 0, 0])
    scenes.run(startSession(frame.id), {
      sourceId: instance.id,
      action: reaction,
      transition: null
    })
    const view = expectDefined(scenes.views.get(frame.id))

    const png = expectDefined(
      snapshotPlayFrame(renderer, view.graph, frame.id, { scale: 1, touched: view.touched })
    )
    expect(pngColorAt(png, 40, 40)).toEqual([0, 255, 0])
    expect(colorAt(graph, frame.id, undefined, 40, 40)).toEqual([255, 0, 0])
  })

  test('draws a frame scrolled as play scrolled it', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      fills: [solid(1, 1, 1)]
    })
    const list = graph.createNode('FRAME', frame.id, {
      y: 20,
      width: 100,
      height: 40,
      clipsContent: true,
      overflowDirection: 'VERTICAL',
      fills: []
    })
    graph.createNode('RECTANGLE', list.id, { width: 100, height: 40, fills: [solid(1, 0, 0)] })
    graph.createNode('RECTANGLE', list.id, {
      y: 40,
      width: 100,
      height: 40,
      fills: [solid(0, 0, 1)]
    })
    const scenes = createPlayScenes(() => graph)
    scenes.scrollBy(frame.id, [frame.id, list.id], 0, 40)
    const png = expectDefined(
      snapshotPlayFrame(renderer, graph, frame.id, { scale: 1, scroll: scenes.scroll })
    )
    expect(pngColorAt(png, 50, 30)).toEqual([0, 0, 255])
  })
})
