import type { Canvas, ImageFilter, MaskFilter, Path } from 'canvaskit-wasm'

import { readEffectiveFigmaRawField } from '@pairdraw/fig'
import type { SceneNode } from '@pairdraw/scene-graph'
import type { Color, Vector } from '@pairdraw/scene-graph/primitives'

import { BLACK } from '#core/constants'

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

const MAX_RAW_NOISE_CELLS = 12_000

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
 * A layer's noise effects: the raw ones an imported file wrote, which keep their own fields, or
 * the modeled ones a layer created here carries. A grain's `seed` picks its pattern; drawing is
 * the reduced dot pattern both share, not Figma's own generator.
 */
function noiseEffectsFor(node: SceneNode): RawNoiseEffect[] {
  const raw = rawNoiseEffects(node)
  if (raw.length > 0) return raw
  return node.effects.flatMap((effect): RawNoiseEffect[] => {
    if (!effect.visible || effect.type !== 'NOISE') return []
    return [
      {
        type: 'NOISE',
        color: effect.color,
        secondaryColor: effect.noise.secondaryColor,
        opacity: effect.noise.opacity,
        density: effect.noise.density,
        noiseSize: effect.noise.noiseSize,
        noiseType: effect.noise.noiseType
      }
    ]
  })
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

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function renderNoiseEffect(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  effect: RawNoiseEffect
): void {
  const density = Math.max(0, Math.min(1, effect.density ?? 0.3))
  const requestedStep = Math.max(2, Math.round((effect.noiseSize?.x ?? 0.5) * 8))
  const boundedStep = Math.ceil(Math.sqrt((node.width * node.height) / MAX_RAW_NOISE_CELLS))
  const step = Math.max(requestedStep, boundedStep)
  const color = effect.color ?? BLACK
  const opacity = effect.opacity ?? color.a
  const paint = new r.ck.Paint()
  try {
    paint.setAntiAlias(false)
    canvas.save()
    r.clipNodeShape(canvas, node)
    for (let y = 0; y < node.height; y += step) {
      for (let x = 0; x < node.width; x += step) {
        const value = seededNoise((x + 1) * 73856093 + (y + 1) * 19349663)
        if (value > density) continue
        const alpha = Math.max(0, Math.min(1, opacity * (0.35 + value * 0.65)))
        paint.setColor(r.ck.Color4f(color.r, color.g, color.b, alpha))
        canvas.drawRect(
          r.ck.LTRBRect(x, y, Math.min(node.width, x + 1), Math.min(node.height, y + 1)),
          paint
        )
      }
    }
    canvas.restore()
  } finally {
    paint.delete()
  }
}

/** Draws a layer's noise effects: raw fields for imported layers, modeled ones created here. */
export function renderNoiseEffects(r: SkiaRenderer, canvas: Canvas, node: SceneNode): void {
  for (const effect of noiseEffectsFor(node)) {
    renderNoiseEffect(r, canvas, node, effect)
  }
}
