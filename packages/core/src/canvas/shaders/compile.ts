/**
 * Compiles a user shader once per source and packs its uniforms for drawing. The declared
 * uniforms order the panel's controls; the compiled effect orders the uniform array, so packing
 * follows the effect's own slot table and the two cannot drift.
 */

import type { CanvasKit, RuntimeEffect } from 'canvaskit-wasm'

import type { Vector } from '@open-pencil/scene-graph/primitives'
import {
  parseShaderUniforms,
  type ShaderUniform,
  type ShaderUniformValue
} from '@open-pencil/scene-graph/shaders'

import { FRAME_HEIGHT_UNIFORM, translateShader } from './translate'

/** A shader source with its compiled effect, or why it could not compile. */
export interface CompiledShader {
  source: string
  uniforms: ShaderUniform[]
  effect: RuntimeEffect | null
  error: string | null
}

/** One cache per CanvasKit instance, so a reload gets fresh effects. */
const caches = new WeakMap<CanvasKit, Map<string, CompiledShader>>()

/** The frame values the renderer supplies instead of the document. */
export interface ShaderFrame {
  width: number
  height: number
  time: number
  mouse: Vector
}

/** The floats of one uniform value, in its declared component count. */
function uniformFloats(uniform: ShaderUniform, value: ShaderUniformValue | undefined): number[] {
  const fallback = uniform.default ?? (uniform.kind === 'color' ? '#000000' : 0)
  const read = value ?? fallback
  if (uniform.kind === 'color') {
    const text = typeof read === 'string' ? read : '#000000'
    const hex = text.replace('#', '')
    const digits = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
    const channel = (at: number) => (Number.parseInt(digits.slice(at, at + 2), 16) || 0) / 255
    const alpha = digits.length >= 8 ? channel(6) : 1
    return [channel(0), channel(2), channel(4), alpha]
  }
  if (uniform.kind === 'boolean') return [typeof read === 'boolean' && read ? 1 : 0]
  if (Array.isArray(read)) {
    return Array.from({ length: uniform.components }, (_, at) => Number(read[at] ?? 0))
  }
  if (typeof read === 'number') return [read]
  if (typeof read === 'boolean') return [read ? 1 : 0]
  return [0]
}

/**
 * The uniform array for `compiled`, with the frame's own values for `@time`, `@resolution`, and
 * `@mouse`. A uniform the effect does not declare is skipped, and a declared one with no value
 * takes the document's default.
 */
export function packShaderUniforms(
  compiled: CompiledShader,
  values: Readonly<Record<string, ShaderUniformValue>>,
  frame: ShaderFrame
): Float32Array {
  const effect = compiled.effect
  if (!effect) return new Float32Array(0)
  const packed = new Float32Array(effect.getUniformFloatCount())
  const declared = new Map(compiled.uniforms.map((uniform) => [uniform.name, uniform]))
  for (let index = 0; index < effect.getUniformCount(); index++) {
    const name = effect.getUniformName(index)
    const slot = effect.getUniform(index).slot
    // The translator's own uniform, which the user never declares.
    if (name === FRAME_HEIGHT_UNIFORM) {
      packed[slot] = frame.height
      continue
    }
    const uniform = declared.get(name)
    if (!uniform) continue
    let floats: number[]
    if (uniform.automatic === 'resolution') floats = [frame.width, frame.height]
    else if (uniform.automatic === 'time') floats = [frame.time]
    else if (uniform.automatic === 'mouse') floats = [frame.mouse.x, frame.mouse.y]
    else floats = uniformFloats(uniform, values[name])
    for (let at = 0; at < floats.length && slot + at < packed.length; at++) {
      packed[slot + at] = floats[at] ?? 0
    }
  }
  return packed
}

/** The sampler uniforms in child order, which is the order the source declares them. */
export function shaderSamplers(compiled: CompiledShader): string[] {
  return compiled.uniforms.filter((uniform) => uniform.kind === 'sampler').map((u) => u.name)
}

/**
 * `source` compiled to a runtime effect, cached. A translation or SkSL error returns `effect:
 * null` with its message; the uniforms parsed before the error stay, so the panel can show them.
 */
export function compileShader(ck: CanvasKit, source: string): CompiledShader {
  let cache = caches.get(ck)
  if (!cache) {
    cache = new Map()
    caches.set(ck, cache)
  }
  const cached = cache.get(source)
  if (cached) return cached

  const parsed = parseShaderUniforms(source)
  if (parsed.error) {
    const failed: CompiledShader = {
      source,
      uniforms: parsed.uniforms,
      effect: null,
      error: parsed.error
    }
    cache.set(source, failed)
    return failed
  }
  const translation = translateShader(source)
  if (translation.error) {
    const failed: CompiledShader = {
      source,
      uniforms: parsed.uniforms,
      effect: null,
      error: translation.error
    }
    cache.set(source, failed)
    return failed
  }

  const failure: { message: string | null } = { message: null }
  const effect = ck.RuntimeEffect.Make(translation.sksl, (error: string) => {
    failure.message = error
  })
  const compiled: CompiledShader = {
    source,
    uniforms: parsed.uniforms,
    effect: effect ?? null,
    error: effect ? null : (failure.message ?? 'The shader could not compile')
  }
  cache.set(source, compiled)
  return compiled
}
