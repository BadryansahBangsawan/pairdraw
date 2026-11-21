import type {
  BlendMode,
  Effect,
  NoiseEffectParams,
  TextureEffectParams
} from '@pairdraw/scene-graph'
import { parseColor } from '@pairdraw/scene-graph/color'
import {
  BLACK,
  DEFAULT_NOISE,
  DEFAULT_NOISE_COLOR,
  DEFAULT_TEXTURE,
  TRANSPARENT
} from '@pairdraw/scene-graph/constants'
import type { Color, Vector } from '@pairdraw/scene-graph/primitives'

import { BLEND_MODE } from './enums'

export type EffectColor = string | Color

export interface ShadowEffectOptions {
  color?: EffectColor
  x?: number
  y?: number
  offset?: Vector
  radius?: number
  spread?: number
  visible?: boolean
  /** Same spellings as a layer's `blendMode`, read case-insensitively. */
  blendMode?: string
  showShadowBehindNode?: boolean
}

export interface BlurEffectOptions {
  radius?: number
  visible?: boolean
}

/** Radius of a shadow or blur that does not set one. */
const DEFAULT_EFFECT_RADIUS = 8

function toColor(color: EffectColor | undefined): Color {
  if (color === undefined) return { ...TRANSPARENT }
  return typeof color === 'string' ? parseColor(color) : color
}

/** A layer's `blendMode` spelling, or undefined when the helper omits it or names none. */
function parsedBlendMode(blendMode: string | undefined): BlendMode | undefined {
  return blendMode === undefined ? undefined : BLEND_MODE.parse(blendMode)
}

function shadowEffect(type: 'DROP_SHADOW' | 'INNER_SHADOW', options: ShadowEffectOptions): Effect {
  return {
    type,
    color: toColor(options.color ?? 'rgba(0, 0, 0, 0.25)'),
    offset: options.offset ?? { x: options.x ?? 0, y: options.y ?? 4 },
    radius: options.radius ?? DEFAULT_EFFECT_RADIUS,
    spread: options.spread ?? 0,
    visible: options.visible ?? true,
    blendMode: parsedBlendMode(options.blendMode),
    showShadowBehindNode: options.showShadowBehindNode
  }
}

function blurEffect(
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR' | 'FOREGROUND_BLUR',
  radiusOrOptions: number | BlurEffectOptions = {}
): Effect {
  const options =
    typeof radiusOrOptions === 'number' ? { radius: radiusOrOptions } : radiusOrOptions
  return {
    type,
    color: { ...TRANSPARENT },
    offset: { x: 0, y: 0 },
    radius: options.radius ?? DEFAULT_EFFECT_RADIUS,
    spread: 0,
    visible: options.visible ?? true
  }
}

export function dropShadow(options: ShadowEffectOptions = {}): Effect {
  return shadowEffect('DROP_SHADOW', options)
}

export function innerShadow(options: ShadowEffectOptions = {}): Effect {
  return shadowEffect('INNER_SHADOW', options)
}

export function layerBlur(radiusOrOptions?: number | BlurEffectOptions): Effect {
  return blurEffect('LAYER_BLUR', radiusOrOptions)
}

export function backgroundBlur(radiusOrOptions?: number | BlurEffectOptions): Effect {
  return blurEffect('BACKGROUND_BLUR', radiusOrOptions)
}

export function foregroundBlur(radiusOrOptions?: number | BlurEffectOptions): Effect {
  return blurEffect('FOREGROUND_BLUR', radiusOrOptions)
}

/** A grain size as Figma's plugin API takes it, one number for both axes, or each axis apart. */
export type NoiseSize = number | Vector

/**
 * A noise effect in Figma's terms: grains in `color`, a duotone's `secondaryColor` too, or a
 * multitone's many colours at `opacity`. Left out, each value is what Figma's panel starts with.
 */
export interface NoiseEffectOptions extends Partial<
  Omit<NoiseEffectParams, 'noiseSize' | 'secondaryColor'>
> {
  noiseSize?: NoiseSize
  color?: EffectColor
  secondaryColor?: EffectColor
  visible?: boolean
}

/** A texture effect in Figma's terms, `radius` being how far its grain moves the edges. */
export interface TextureEffectOptions extends Partial<Omit<TextureEffectParams, 'noiseSize'>> {
  noiseSize?: NoiseSize
  radius?: number
  visible?: boolean
}

/** Radius of a new texture effect, as Figma's effects panel starts one. */
const DEFAULT_TEXTURE_RADIUS = 4

function noiseSize(size: NoiseSize | undefined, fallback: Vector): Vector {
  if (size === undefined) return { ...fallback }
  return typeof size === 'number' ? { x: size, y: size } : { ...size }
}

/**
 * A noise effect. A duotone's second colour starts white at the first colour's opacity and a
 * multitone's opacity at that opacity, as Figma's panel switches them.
 */
export function noise(options: NoiseEffectOptions = {}): Effect {
  const color = options.color === undefined ? { ...DEFAULT_NOISE_COLOR } : toColor(options.color)
  const params: NoiseEffectParams = {
    noiseType: options.noiseType ?? DEFAULT_NOISE.noiseType,
    noiseSize: noiseSize(options.noiseSize, DEFAULT_NOISE.noiseSize),
    density: options.density ?? DEFAULT_NOISE.density
  }
  // A second colour or opacity given is kept whatever the type, so switching back finds it; a
  // duotone or multitone that lacks one starts where Figma's panel does.
  if (options.secondaryColor !== undefined) params.secondaryColor = toColor(options.secondaryColor)
  else if (params.noiseType === 'DUOTONE') params.secondaryColor = { r: 1, g: 1, b: 1, a: color.a }
  if (options.opacity !== undefined) params.opacity = options.opacity
  else if (params.noiseType === 'MULTITONE') params.opacity = color.a
  if (options.seed !== undefined) params.seed = options.seed
  return { type: 'NOISE', color, visible: options.visible ?? true, noise: params }
}

/** A texture effect, which roughens the layer's edges by `radius`. */
export function texture(options: TextureEffectOptions = {}): Effect {
  const params: TextureEffectParams = {
    noiseSize: noiseSize(options.noiseSize, DEFAULT_TEXTURE.noiseSize),
    clipToShape: options.clipToShape ?? DEFAULT_TEXTURE.clipToShape
  }
  if (options.seed !== undefined) params.seed = options.seed
  return {
    type: 'TEXTURE',
    color: { ...BLACK },
    radius: options.radius ?? DEFAULT_TEXTURE_RADIUS,
    visible: options.visible ?? true,
    texture: params
  }
}
