import { afterAll, describe, expect, test } from 'bun:test'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { createPlayScenes, startSession } from '@pairdraw/core/prototype'
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
  playScenes: ReturnType<typeof createPlayScenes>['views'] | undefined,
  x: number,
  y: number
): number[] {
  const surface = expectDefined(ck.MakeSurface(100, 100))
  try {
    renderer.worldViewport = { x: -1e6, y: -1e6, w: 2e6, h: 2e6 }
    renderer.renderNode(surface.getCanvas(), graph, frameId, { playing: true, playScenes })
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
    expect(colorAt(graph, frame.id, scenes.views, 40, 40)).toEqual([255, 0, 0])

    scenes.run(startSession(frame.id), {
      sourceId: instance.id,
      action: reaction,
      transition: null
    })
    expect(colorAt(graph, frame.id, scenes.views, 40, 40)).toEqual([0, 255, 0])

    scenes.clear()
    expect(colorAt(graph, frame.id, scenes.views, 40, 40)).toEqual([255, 0, 0])
  })
})
