import type { Canvas, Image, Shader } from 'canvaskit-wasm'

import type { NoiseEffect } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'

import {
  NOISE_GRAIN_SOURCE,
  noiseTileInputs,
  noiseUniformValues,
  packNoiseUniforms
} from './shader'
import { noiseColorTile, noiseLevelTile } from './tile'

/** Catmull-Rom as Skia's cubic resampler: B 0, C 0.5, the blend Figma's grains were fitted to. */
const CATMULL_ROM = { B: 0, C: 0.5 }

/**
 * `tile` as a repeating shader in cell units, blended between cells or one value per cell.
 */
function tileShader(r: SkiaRenderer, tile: Image, blend: boolean): Shader {
  const repeat = r.ck.TileMode.Repeat
  return blend
    ? tile.makeShaderCubic(repeat, repeat, CATMULL_ROM.B, CATMULL_ROM.C)
    : tile.makeShaderOptions(repeat, repeat, r.ck.FilterMode.Nearest, r.ck.MipmapMode.None)
}

/**
 * Draws `noises` over the layer they grain, inside its shape and in the order they are listed.
 * Returns false when the runtime shader does not compile, so a caller can fall back.
 */
export function renderFigmaNoiseEffects(
  r: SkiaRenderer,
  canvas: Canvas,
  node: { width: number; height: number },
  shape: (canvas: Canvas) => void,
  noises: readonly NoiseEffect[]
): boolean {
  if (noises.length === 0) return true
  r.noiseGrainEffect ??= r.ck.RuntimeEffect.Make(NOISE_GRAIN_SOURCE)
  const effect = r.noiseGrainEffect
  if (!effect) return false

  canvas.save()
  shape(canvas)
  const paint = new r.ck.Paint()
  try {
    paint.setAntiAlias(false)
    paint.setBlendMode(r.ck.BlendMode.SrcOver)
    const box = r.ck.LTRBRect(0, 0, node.width, node.height)
    for (const noise of noises) {
      const { shares, seed, blend } = noiseTileInputs(noise)
      const levelTile = noiseLevelTile(r, shares, seed)
      // Only a multitone reads cell colours; the others bind the levels in their place.
      const colorTile = noise.noise.noiseType === 'MULTITONE' ? noiseColorTile(r, seed) : levelTile
      if (!levelTile || !colorTile) continue
      const levels = tileShader(r, levelTile, blend)
      const colors = tileShader(r, colorTile, false)
      const shader = effect.makeShaderWithChildren(
        packNoiseUniforms(effect, noiseUniformValues(noise, r.documentColorSpace)),
        [levels, colors]
      )
      paint.setShader(shader)
      canvas.drawRect(box, paint)
      paint.setShader(null)
      shader.delete()
      levels.delete()
      colors.delete()
    }
  } finally {
    paint.delete()
    canvas.restore()
  }
  return true
}
