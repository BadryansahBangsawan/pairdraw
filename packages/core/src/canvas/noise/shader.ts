import type { RuntimeEffect } from 'canvaskit-wasm'

import type { ColorProfile, NoiseEffect, NoiseEffectParams } from '@pairdraw/scene-graph'
import { toExtendedSRGB } from '@pairdraw/scene-graph/color'

import { noiseLevelShares, noiseMeanLevel } from './table'

/**
 * Figma's noise effect as a Skia runtime shader. Figma's own generator is not public, so this
 * draws noise with Figma's statistics instead, measured from Figma 126 PNG exports: the exact
 * spread over 17 levels at every density for grain size 1, and for larger grains the spread,
 * saturation, and pixel-to-pixel correlation of each size.
 *
 * `levels` holds each cell's level made on the CPU: in red, and for a duotone the level of the
 * opposite value in green, 15 to a level. It is sampled in cells of `cell` units, per axis for a
 * grain wider than tall: as is for cells a pixel wide, and through Catmull-Rom between larger
 * ones. `colors` gives a multitone's cells their colours. `snap` stays 0: an export draws at every
 * rendered pixel, so the shader samples where it draws.
 */
export const NOISE_GRAIN_SOURCE = `
uniform shader levels;
uniform shader colors;
uniform float2 cell;
uniform float contrast;
uniform float center;
uniform float mode;
uniform half4 primary;
uniform half4 secondary;
uniform float opacity;
uniform float snap;
uniform float2 toOutputX;
uniform float2 toOutputY;
uniform float2 toOutputOrigin;
uniform float2 fromOutputX;
uniform float2 fromOutputY;
uniform float2 fromOutputOrigin;

/** A level, 0 to 1, stretched around the mean and quantised to Figma's 17 steps. */
float shaped(float level) {
  float v = clamp(center + (level - center) * contrast, 0.0, 1.0);
  return floor(v * 16.0 + 0.5) / 16.0;
}

half4 main(float2 p) {
  if (snap > 0.5) {
    float2 q = floor(toOutputOrigin + p.x * toOutputX + p.y * toOutputY) + 0.5;
    p = fromOutputOrigin + q.x * fromOutputX + q.y * fromOutputY;
  }
  float2 c = p / cell;
  // 15 to a level in a byte: 255 / 240 turns a channel back into sixteenths.
  half2 l = levels.eval(c).rg * half(255.0 / 240.0);
  if (mode > 1.5) {
    // Figma's multitone colours keep near grey: each channel strays 0.56 as far as a uniform one.
    half3 rgb = half3(0.5) + (colors.eval(floor(c) + 0.5).rgb - half3(0.5)) * 0.56;
    half a = half(shaped(l.r) * opacity);
    return half4(rgb * a, a);
  }
  half a1 = half(shaped(l.r)) * primary.a;
  if (mode < 0.5) return half4(primary.rgb * a1, a1);
  half a2 = half(shaped(l.g)) * secondary.a;
  return half4(primary.rgb * a1 + secondary.rgb * a2, min(half(1.0), a1 + a2));
}
`

/**
 * How much Figma stretches its grains' contrast at each grain size, fitted to the spread of its
 * exports: under 1 its pixels average several grains and lose contrast, over 1 it sharpens the
 * blend between grains until large ones are nearly all on or off.
 */
const CONTRAST_BY_SIZE: readonly (readonly [number, number])[] = [
  [0.25, 0.36],
  [0.5, 0.457],
  [0.75, 0.595],
  [1, 1],
  [1.5, 1.34],
  [2, 1.84],
  [3, 2.45],
  [4, 3.16],
  [6, 4.5],
  [8, 5.73],
  [16, 11.48]
]

/** Figma's contrast for grain `size`, between the fitted sizes and along their trend beyond. */
export function noiseContrast(size: number): number {
  const first = CONTRAST_BY_SIZE[0]
  const last = CONTRAST_BY_SIZE[CONTRAST_BY_SIZE.length - 1]
  if (size <= first[0]) return first[1]
  if (size >= last[0]) return 0.7 * size + 0.3
  const upper = CONTRAST_BY_SIZE.findIndex(([at]) => at >= size)
  const [s0, k0] = CONTRAST_BY_SIZE[upper - 1]
  const [s1, k1] = CONTRAST_BY_SIZE[upper]
  return k0 + ((k1 - k0) * (size - s0)) / (s1 - s0)
}

/**
 * The cell, in layer units, Figma's grains of `size` vary over: one unit at size 1 and below,
 * where each pixel is its own grain, and about 0.4 · size + 0.45 above, fitted to how far apart
 * Figma's pixels stop matching.
 */
export function noiseCell(size: number): number {
  return size <= 1 ? 1 : 0.4 * size + 0.45
}

const NOISE_MODE: Record<NoiseEffectParams['noiseType'], number> = {
  MONOTONE: 0,
  DUOTONE: 1,
  MULTITONE: 2
}

/**
 * What the shader's `levels` and `colors` tiles are made from: the shares of pixels at each level
 * for the density, and the seed; and whether cells wider than a pixel blend between each other.
 */
export function noiseTileInputs(effect: NoiseEffect) {
  const grain = effect.noise
  return {
    shares: noiseLevelShares(grain.density),
    seed: grain.seed ?? 0,
    blend: Math.max(noiseCell(grain.noiseSize.x), noiseCell(grain.noiseSize.y)) > 1
  }
}

/**
 * A uniform's values under the name the shader declares it, in declaration order. Colors are the
 * document's, given to the shader as extended sRGB so Skia converts them into its space.
 */
export function noiseUniformValues(
  effect: NoiseEffect,
  profile: ColorProfile = 'srgb'
): Record<string, number[]> {
  const grain = effect.noise
  const size = Math.max(grain.noiseSize.x, grain.noiseSize.y)
  const primary = toExtendedSRGB(effect.color, profile)
  const secondary = toExtendedSRGB(grain.secondaryColor ?? effect.color, profile)
  return {
    cell: [noiseCell(grain.noiseSize.x), noiseCell(grain.noiseSize.y)],
    contrast: [noiseContrast(size)],
    center: [noiseMeanLevel(noiseLevelShares(grain.density))],
    mode: [NOISE_MODE[grain.noiseType]],
    primary: [primary.r, primary.g, primary.b, primary.a],
    secondary: [secondary.r, secondary.g, secondary.b, secondary.a],
    opacity: [grain.opacity ?? 1],
    snap: [0],
    toOutputX: [0, 0],
    toOutputY: [0, 0],
    toOutputOrigin: [0, 0],
    fromOutputX: [0, 0],
    fromOutputY: [0, 0],
    fromOutputOrigin: [0, 0]
  }
}

/**
 * `values` in the array `program` expects: each uniform begins at the slot the compiled shader
 * reports for it, so no packing rule is assumed here.
 */
export function packNoiseUniforms(
  program: RuntimeEffect,
  values: Record<string, readonly number[]>
): Float32Array {
  const data = new Float32Array(program.getUniformFloatCount())
  for (let index = 0; index < program.getUniformCount(); index++) {
    const name = program.getUniformName(index)
    if (!Object.hasOwn(values, name)) continue
    data.set(values[name], program.getUniform(index).slot)
  }
  return data
}
