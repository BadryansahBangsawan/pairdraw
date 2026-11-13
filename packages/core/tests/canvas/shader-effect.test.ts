import { afterAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { initCanvasKit } from '@open-pencil/core/io/formats/raster'
import { SceneGraph, type Effect, type Fill } from '@open-pencil/scene-graph'

import { SkiaRenderer } from '#core/canvas'

const ck = await initCanvasKit()

const WIDTH = 40
const HEIGHT = 20
const surface = expectDefined(ck.MakeSurface(WIDTH, HEIGHT), 'surface')
const renderer = new SkiaRenderer(ck, surface)

afterAll(() => renderer.destroy())

const RED: Fill = {
  type: 'SOLID',
  color: { r: 1, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true
}

/**
 * A layer shader that paints the green channel with what it samples through `@object`, so a green
 * pixel proves the effect drew the layer into itself. Reads the object in layer pixels.
 */
const SAMPLES_LAYER = `#version 300 es
precision highp float;
/** @resolution */
uniform vec2 u_resolution;
/** @object */
uniform sampler2D u_layer;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  gl_FragColor = vec4(0.0, texture2D(u_layer, uv).r, 0.0, 1.0);
}`

/** Paints the blue channel with what it samples, so a blue pixel proves it read the pass before it. */
const SAMPLES_GREEN = `#version 300 es
precision highp float;
/** @resolution */
uniform vec2 u_resolution;
/** @object */
uniform sampler2D u_layer;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  gl_FragColor = vec4(0.0, 0.0, texture2D(u_layer, uv).g, 1.0);
}`

function shaderEffect(source: string): Effect {
  return { type: 'SHADER', source, uniforms: {}, visible: true }
}

/** Draws a red layer with `effects` and returns the pixel at its centre. */
function drawCentre(effects: Effect[]): number[] {
  const graph = new SceneGraph()
  const node = graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    width: WIDTH,
    height: HEIGHT,
    fills: [RED],
    effects
  })
  const canvas = surface.getCanvas()
  canvas.clear(ck.TRANSPARENT)
  renderer.renderNode(canvas, graph, node.id, {})
  surface.flush()
  const image = surface.makeImageSnapshot()
  try {
    const pixels = expectDefined(
      image.readPixels(0, 0, {
        width: WIDTH,
        height: HEIGHT,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'shader effect pixels'
    )
    const offset = ((HEIGHT / 2) * WIDTH + WIDTH / 2) * 4
    return Array.from(pixels.slice(offset, offset + 4))
  } finally {
    image.delete()
  }
}

describe('a layer shader effect', () => {
  test('draws the layer into the shader through @object', () => {
    expect(drawCentre([shaderEffect(SAMPLES_LAYER)])).toEqual([0, 255, 0, 255])
  })

  test('draws the layer as usual while its code does not compile', () => {
    expect(drawCentre([shaderEffect('void main(){ gl_FragColor = nope; }')])).toEqual([
      255, 0, 0, 255
    ])
  })

  test('is left out while it is hidden', () => {
    const hidden = { ...shaderEffect(SAMPLES_LAYER), visible: false }
    expect(drawCentre([hidden])).toEqual([255, 0, 0, 255])
  })

  test('draws a second effect over what the first one drew', () => {
    expect(drawCentre([shaderEffect(SAMPLES_LAYER), shaderEffect(SAMPLES_GREEN)])).toEqual([
      0, 0, 255, 255
    ])
  })

  test('draws the next effect when an earlier one does not compile', () => {
    expect(
      drawCentre([shaderEffect('void main(){ gl_FragColor = nope; }'), shaderEffect(SAMPLES_LAYER)])
    ).toEqual([0, 255, 0, 255])
  })
})
