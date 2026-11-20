/**
 * An image paint's adjustments as a Skia runtime shader over the image, matched to Figma's
 * exports pixel for pixel (within one level of 8 bits). Each pixel, unpremultiplied and in
 * gamma 2.2 light, goes through three steps in Figma's order:
 *
 * 1. Temperature, tint, and contrast in CIELab: a* and b* shift, and contrast moves L*.
 * 2. Exposure, highlights, and shadows in one pass: a Reinhard-type curve per channel whose
 *    strength is exposure plus highlights and shadows weighed by the pixel's original luminance.
 * 3. Saturation, scaling the colour's distance from its luminance.
 */

import type { RuntimeEffect, Shader } from 'canvaskit-wasm'

import type { ImageFilters } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'

import adjustmentsSource from './adjustments.sksl?raw'

/** The adjustment uniforms in the shader's declaration order. */
const FILTER_UNIFORMS = [
  'exposure',
  'contrast',
  'saturation',
  'temperature',
  'tint',
  'highlights',
  'shadows'
] as const satisfies ReadonlyArray<keyof ImageFilters>

/** Whether `filters` changes any pixel. */
export function hasImageAdjustments(filters: ImageFilters | undefined): filters is ImageFilters {
  return !!filters && Object.values(filters).some((value) => value !== undefined && value !== 0)
}

/**
 * The compiled adjustments effect per CanvasKit: compiled once, not per draw, and freed with the
 * renderer that made it. The filter over an image is a runtime-effect shader made from it, which
 * Skia builds cheaply; the expensive part, compiling the SkSL, happens once.
 */
const effects = new WeakMap<SkiaRenderer['ck'], RuntimeEffect>()

function adjustmentsEffect(r: SkiaRenderer): RuntimeEffect {
  const cached = effects.get(r.ck)
  if (cached) return cached
  let error = ''
  const effect = r.ck.RuntimeEffect.Make(adjustmentsSource, (message) => {
    error = message
  })
  if (!effect) throw new Error(`Cannot compile the image adjustments: ${error}`)
  effects.set(r.ck, effect)
  return effect
}

/** Frees the adjustments effect a CanvasKit holds, as its renderer is destroyed. */
export function releaseImageAdjustments(ck: SkiaRenderer['ck']): void {
  effects.get(ck)?.delete()
  effects.delete(ck)
}

/**
 * `image` with `filters` applied to every pixel. The caller owns both shaders: it deletes the
 * returned shader after setting it on the paint, and the image shader under it, as the plain
 * image path does. The effect the filter is made from is compiled once per CanvasKit and cached,
 * so a redraw never recompiles the SkSL.
 */
export function adjustedImageShader(r: SkiaRenderer, image: Shader, filters: ImageFilters): Shader {
  const values = FILTER_UNIFORMS.map((name) => filters[name] ?? 0)
  return adjustmentsEffect(r).makeShaderWithChildren(values, [image])
}
