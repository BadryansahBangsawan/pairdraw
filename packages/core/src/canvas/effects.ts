import type { Canvas, ImageFilter, MaskFilter, Path } from 'canvaskit-wasm'

import { readEffectiveFigmaRawField } from '@pairdraw/fig'
import type { NoiseEffect, SceneNode } from '@pairdraw/scene-graph'
import { UNSET_NOISE } from '@pairdraw/scene-graph/constants'
import type { Color, Vector } from '@pairdraw/scene-graph/primitives'

import { BLACK } from '#core/constants'

import { renderFigmaNoiseEffects } from './noise/render'
import type { SkiaRenderer } from './renderer'

/**
 * CanvasKit's typings promise a filter, but a zero sigma hands back null; the filters are cached and
 * the cache disposes what it holds, so the null has to stay out of it and out of any delete.
 */
function mayBeNull<T>(filter: T): T | null {
  return filter
}

export function getCachedDropShadow(
  r: SkiaRenderer,
  dx: number,
  dy: number,
  sigma: number,
  color: Float32Array
): ImageFilter | null {
  const key = `ds:${dx},${dy},${sigma},${color[0]},${color[1]},${color[2]},${color[3]}`
  const cached = r.imageFilterCache.get(key)
  if (cached) return cached
  // CanvasKit answers a zero sigma with null, and the cache disposes what it holds.
  const made = mayBeNull(r.ck.ImageFilter.MakeDropShadowOnly(dx, dy, sigma, sigma, color, null))
  if (made) r.imageFilterCache.set(key, made)
  return made
}

export function getCachedBlur(r: SkiaRenderer, sigma: number): ImageFilter | null {
  const key = `blur:${sigma}`
  const cached = r.imageFilterCache.get(key)
  if (cached) return cached
  const made = mayBeNull(r.ck.ImageFilter.MakeBlur(sigma, sigma, r.ck.TileMode.Clamp, null))
  if (made) r.imageFilterCache.set(key, made)
  return made
}

export function getCachedDecalBlur(r: SkiaRenderer, sigma: number): ImageFilter | null {
  const key = `dblur:${sigma}`
  const cached = r.imageFilterCache.get(key)
  if (cached) return cached
  const made = mayBeNull(r.ck.ImageFilter.MakeBlur(sigma, sigma, r.ck.TileMode.Decal, null))
  if (made) r.imageFilterCache.set(key, made)
  return made
}

export function getCachedMaskBlur(r: SkiaRenderer, sigma: number): MaskFilter | null {
  const cached = r.maskFilterCache.get(sigma)
  if (cached) return cached
  const made = mayBeNull(r.ck.MaskFilter.MakeBlur(r.ck.BlurStyle.Normal, sigma, true))
  if (made) r.maskFilterCache.set(sigma, made)
  return made
}

/**
 * Blurs what lies behind the layer, inside its outline, or inside `shape` when the layer's outline
 * is not its box, as with a boolean's result.
 */
export function applyClippedBlur(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  sigma: number,
  shape: Path | null = null
): void {
  const rect = r.ck.LTRBRect(0, 0, node.width, node.height)
  // Entry guard: reset shared paint to known state
  r.effectLayerPaint.setImageFilter(null)
  r.effectLayerPaint.setColorFilter(null)
  r.effectLayerPaint.setBlendMode(r.ck.BlendMode.SrcOver)

  canvas.save()
  if (shape) canvas.clipPath(shape, r.ck.ClipOp.Intersect, true)
  else r.clipNodeShape(canvas, node)
  canvas.saveLayer(undefined, rect, r.getCachedBlur(sigma), undefined, r.ck.TileMode.Clamp)
  canvas.restore()
  // Exit guard: ensure shared paint is in clean state
  r.effectLayerPaint.setImageFilter(null)
  r.effectLayerPaint.setColorFilter(null)
  r.effectLayerPaint.setBlendMode(r.ck.BlendMode.SrcOver)
  canvas.restore()
}

interface RawNoiseEffect {
  type: 'NOISE'
  visible?: boolean
  color?: Color
  secondaryColor?: Color
  opacity?: number
  density?: number
  noiseSize?: Vector
  noiseType?: 'MONOTONE' | 'DUOTONE' | 'MULTITONE'
}

function rawNoiseEffects(node: SceneNode): RawNoiseEffect[] {
  const source = (node as Partial<SceneNode>).source
  const effects = source ? readEffectiveFigmaRawField(node, 'effects') : undefined
  if (!Array.isArray(effects)) return []
  return effects.filter(
    (effect): effect is RawNoiseEffect =>
      effect !== null &&
      typeof effect === 'object' &&
      'type' in effect &&
      effect.type === 'NOISE' &&
      ('visible' in effect ? effect.visible !== false : true)
  )
}

/**
 * A layer's noise effects: the raw ones an imported file wrote, converted to the grain the scene
 * graph models, or the modeled ones a layer created here carries. A grain's `seed` picks its
 * pattern.
 */
function noiseEffectsFor(node: SceneNode): NoiseEffect[] {
  const raw = rawNoiseEffects(node)
  if (raw.length > 0) return raw.map(noiseFromRaw)
  return node.effects.flatMap((effect): NoiseEffect[] => {
    if (!effect.visible || effect.type !== 'NOISE') return []
    return [effect]
  })
}

/** A raw `.fig` noise record as the grain the scene graph models. */
function noiseFromRaw(effect: RawNoiseEffect): NoiseEffect {
  return {
    type: 'NOISE',
    color: effect.color ?? BLACK,
    visible: true,
    noise: {
      noiseType: effect.noiseType ?? UNSET_NOISE.noiseType,
      noiseSize: effect.noiseSize ?? UNSET_NOISE.noiseSize,
      density: effect.density ?? UNSET_NOISE.density,
      secondaryColor: effect.secondaryColor,
      opacity: effect.opacity
    }
  }
}

/** Whether a node carries an effect a reduced-effects canvas leaves out, so a picture recorded on
 * one would not match an export. */
export function hasReducibleEffects(node: SceneNode): boolean {
  return (
    node.effects.some(
      (effect) => effect.visible && (effect.type === 'BACKGROUND_BLUR' || effect.type === 'NOISE')
    ) || rawNoiseEffects(node).length > 0
  )
}

/**
 * Draws a layer's noise effects: raw records from an imported file or the grains a layer created
 * here carries, through Figma's statistics over cached tiles. The layer's shape clips the grain;
 * whether the content covers each pixel is not measured, so a frame's grain shows across its box.
 */
export function renderNoiseEffects(r: SkiaRenderer, canvas: Canvas, node: SceneNode): void {
  renderFigmaNoiseEffects(
    r,
    canvas,
    node,
    (target) => r.clipNodeShape(target, node),
    noiseEffectsFor(node)
  )
}
