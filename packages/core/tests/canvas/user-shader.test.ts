import { afterAll, describe, expect, test } from 'bun:test'

import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'
import { createShaderSourcePaint, withShaderPaints } from '@pairdraw/scene-graph/shaders'

import { expectDefined } from '#core-tests/helpers/assert'
import { SkiaRenderer } from '#core/canvas'
import { compileShader, packShaderUniforms, shaderSamplers } from '#core/canvas/shaders/compile'
import { translateShader } from '#core/canvas/shaders/translate'

const ck = await initCanvasKit()

const SDF_SHADER = `#version 300 es
precision highp float;
/** @resolution */
uniform vec2 u_resolution;
uniform float u_radius;

/** @sdf */
uniform sampler2D u_shape;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float d = texture2D(u_shape, uv).r;
  gl_FragColor = vec4(vec3(step(d, u_radius)), 1.0);
}`

describe('translateShader', () => {
  test('names the missing entry point', () => {
    expect(translateShader('void other() {}').error).toContain('void main()')
  })

  test('keeps user code, adds an entry point', () => {
    const { sksl, error } = translateShader(
      '#version 300 es\nprecision highp float;\nvoid main(){gl_FragColor=vec4(1.0);}'
    )
    expect(error).toBeNull()
    expect(sksl).not.toContain('#version')
    expect(sksl).not.toContain('precision')
    expect(sksl).toContain('void userMain(float2 u_fragCoord)')
    expect(sksl).toContain('half4 main(float2 u_fragCoord)')
    expect(sksl).toContain('return half4(u_fragColor)')
    expect(sksl).not.toContain('gl_FragColor')
  })

  test('flips y into GLSL coordinates about the frame height', () => {
    const { sksl } = translateShader('void main(){ gl_FragColor = vec4(1.0); }')
    expect(sksl).toContain('uniform float u_ompFrameHeight;')
    expect(sksl).toContain('userMain(float2(u_fragCoord.x, u_ompFrameHeight - u_fragCoord.y))')
  })

  test('rewrites types and SDF samples', () => {
    const { sksl } = translateShader(
      'uniform sampler2D s; void main(){ gl_FragColor = texture2D(s, vec2(0.5)); }'
    )
    expect(sksl).toContain('uniform shader s;')
    expect(sksl).toContain('float4(s.eval((float2(0.5)) * 128.0))')
    expect(sksl).not.toContain('vec2')
  })
})

describe('compileShader', () => {
  test('compiles a filled shader', () => {
    const compiled = compileShader(
      ck,
      'void main(){ gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }'
    )
    expect(compiled.error).toBeNull()
    expect(compiled.effect).not.toBeNull()
  })

  test('compiles a shader with uniforms and an SDF', () => {
    const compiled = compileShader(ck, SDF_SHADER)
    expect(compiled.error).toBeNull()
    expect(compiled.uniforms.map((uniform) => uniform.name)).toEqual([
      'u_resolution',
      'u_radius',
      'u_shape'
    ])
    expect(shaderSamplers(compiled)).toEqual(['u_shape'])
  })

  test('returns the compiler message for broken code', () => {
    const compiled = compileShader(ck, 'void main(){ gl_FragColor = nope; }')
    expect(compiled.effect).toBeNull()
    expect(compiled.error).toBeTruthy()
  })

  test('returns the parser message over the budget', () => {
    const compiled = compileShader(ck, `void main(){}${' '.repeat(17 * 1024)}`)
    expect(compiled.effect).toBeNull()
    expect(compiled.error).toContain('the limit is')
  })

  test('packs document values and frame inputs in slot order', () => {
    const compiled = compileShader(ck, SDF_SHADER)
    const effect = compiled.effect
    if (!effect) throw new Error('shader did not compile')
    const packed = packShaderUniforms(
      compiled,
      { u_radius: 0.25 },
      { width: 100, height: 50, time: 2, mouse: { x: 3, y: 4 } }
    )
    expect(packed.length).toBe(effect.getUniformFloatCount())
    const slotOf = (name: string) => {
      for (let index = 0; index < effect.getUniformCount(); index++) {
        if (effect.getUniformName(index) === name) return effect.getUniform(index).slot
      }
      throw new Error(`no uniform ${name}`)
    }
    expect(Array.from(packed.slice(slotOf('u_resolution'), slotOf('u_resolution') + 2))).toEqual([
      100, 50
    ])
    expect(packed[slotOf('u_radius')]).toBeCloseTo(0.25, 6)
  })

  test('caches one compile per source', () => {
    const first = compileShader(ck, SDF_SHADER)
    expect(compileShader(ck, SDF_SHADER)).toBe(first)
  })
})

const WIDTH = 40
const HEIGHT = 20
const surface = expectDefined(ck.MakeSurface(WIDTH, HEIGHT), 'surface')
const renderer = new SkiaRenderer(ck, surface)

afterAll(() => renderer.destroy())

/** Draws a layer whose fill is the shader `source` draws, and returns the surface's pixels. */
function drawSource(source: string, imageKey?: string): Uint8Array | Float32Array {
  const graph = new SceneGraph()
  const created = createShaderSourcePaint(source)
  const paint = created.paint
  const shader = imageKey ? { ...created.shader, image: imageKey } : created.shader
  const fill: Fill = { ...paint, imageHash: shader.image }
  const node = graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    width: WIDTH,
    height: HEIGHT,
    fills: [fill],
    pluginData: withShaderPaints({ pluginData: [] }, [fill], [shader])
  })
  const canvas = surface.getCanvas()
  canvas.clear(ck.TRANSPARENT)
  renderer.renderShape(canvas, node, graph)
  surface.flush()
  const image = surface.makeImageSnapshot()
  try {
    const pixels = image.readPixels(0, 0, {
      width: WIDTH,
      height: HEIGHT,
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Unpremul,
      colorSpace: ck.ColorSpace.SRGB
    })
    if (!pixels) throw new Error('no pixels')
    return pixels
  } finally {
    image.delete()
  }
}

function colorAt(pixels: Uint8Array | Float32Array, x: number, y: number): number[] {
  const offset = (y * WIDTH + x) * 4
  return Array.from(pixels.slice(offset, offset + 4))
}

describe('a fill that draws shader code', () => {
  test('draws the code live, with no frame image', () => {
    const pixels = drawSource('void main(){ gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }')
    expect(colorAt(pixels, WIDTH / 2, HEIGHT / 2)).toEqual([255, 0, 0, 255])
  })

  test('counts gl_FragCoord from the bottom, as GLSL does', () => {
    const pixels = drawSource(`/** @resolution */
uniform vec2 u_resolution;
void main(){
  float top = gl_FragCoord.y > u_resolution.y * 0.5 ? 1.0 : 0.0;
  gl_FragColor = vec4(top, 0.0, 1.0 - top, 1.0);
}`)
    expect(colorAt(pixels, WIDTH / 2, 1).slice(0, 3)).toEqual([255, 0, 0])
    expect(colorAt(pixels, WIDTH / 2, HEIGHT - 2).slice(0, 3)).toEqual([0, 0, 255])
  })

  test('samples the shape SDF, inside and outside its outline', () => {
    const pixels = drawSource(`/** @sdf */
uniform sampler2D u_shape;
void main(){
  float inside = step(0.5, texture2D(u_shape, gl_FragCoord.xy / vec2(40.0, 20.0)).r);
  gl_FragColor = vec4(inside, 0.0, 0.0, 1.0);
}`)
    expect(colorAt(pixels, WIDTH / 2, HEIGHT / 2)).toEqual([255, 0, 0, 255])
  })

  test('keeps the last good effect while an edit does not compile', () => {
    const image = 'shared'
    expect(
      colorAt(drawSource('void main(){ gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }', image),
        WIDTH / 2, HEIGHT / 2)[1]
    ).toBe(255)
    const broken = drawSource('void main(){ gl_FragColor = nope; }', image)
    expect(colorAt(broken, WIDTH / 2, HEIGHT / 2)).toEqual([0, 255, 0, 255])
  })
})