/**
 * Draws a fill whose paint is shader code the user wrote. The code compiles to a CanvasKit runtime
 * effect, the SDF uniforms become child shaders, and the result replaces the fill's image shader.
 * A source that stops compiling keeps the effect it had while it did, so an edit in the panel
 * never blanks the layer mid-typing.
 */

import type { Shader } from 'canvaskit-wasm'

import type { Fill, SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  isShaderSourcePaint,
  shaderOfPaint,
  type ShaderSourcePaint
} from '@pairdraw/scene-graph/shaders'

import type { SkiaRenderer } from '#core/canvas/renderer'

import { boundUniformValues } from './bindings'
import { compileShader, packShaderUniforms, shaderSamplers, type CompiledShader } from './compile'
import { sdfShader } from './sdf'

/** When the page started drawing shaders, which is what `@time` counts from. */
const startedAt = Date.now()

/** The effect each paint last compiled with, by frame image, so a broken edit keeps drawing. */
const lastGood = new Map<string, CompiledShader>()

/** How many paints keep a last good effect, so a long session does not hold every one forever. */
const KEEP_LAST_GOOD = 32

/** The seconds since the page started, which `@time` reports. */
function shaderSeconds(): number {
  return (Date.now() - startedAt) / 1000
}

/**
 * The effect to draw `shader` with: its own compile, or the one it last compiled with. Null when
 * it has never compiled, which leaves the fill drawing its still frame.
 */
function effectFor(r: SkiaRenderer, shader: ShaderSourcePaint): CompiledShader | null {
  const compiled = compileShader(r.ck, shader.source)
  if (compiled.effect) {
    lastGood.delete(shader.image)
    lastGood.set(shader.image, compiled)
    while (lastGood.size > KEEP_LAST_GOOD) {
      const oldest = lastGood.keys().next().value
      if (oldest === undefined) break
      lastGood.delete(oldest)
    }
    return compiled
  }
  return lastGood.get(shader.image) ?? null
}

/**
 * Draws `fill` as the shader it names, when that shader is user code. Returns false when the fill
 * is not a source shader or nothing compiled yet, so the caller draws the image it holds.
 */
export function drawUserShaderFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  graph: SceneGraph
): boolean {
  const shader = shaderOfPaint(node, fill)
  if (!shader || !isShaderSourcePaint(shader)) return false
  const compiled = effectFor(r, shader)
  if (!compiled?.effect) return false

  const uniforms = packShaderUniforms(
    compiled,
    boundUniformValues(shader.uniforms, shader.uniformBindings, graph, node.id),
    {
      width: node.width,
      height: node.height,
      time: shaderSeconds(),
      mouse: { x: 0, y: 0 }
    }
  )

  const children: Shader[] = []
  try {
    for (let at = 0; at < shaderSamplers(compiled).length; at++) {
      const child = sdfShader(r.ck, r, node)
      if (!child) return false
      children.push(child)
    }
    const drawn = compiled.effect.makeShaderWithChildren(uniforms, children)
    r.fillPaint.setShader(drawn)
    drawn.delete()
    return true
  } finally {
    for (const child of children) child.delete()
  }
}
