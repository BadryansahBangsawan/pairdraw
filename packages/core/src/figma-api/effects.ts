import * as v from 'valibot'

import type {
  BlendMode,
  Effect,
  NoiseEffect,
  NoiseEffectParams,
  ShaderEffect,
  TextureEffect
} from '@pairdraw/scene-graph'
import { BLACK } from '@pairdraw/scene-graph/constants'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import { TRANSPARENT } from '#core/constants'

const BLEND_MODE_KEYS = {
  NORMAL: true,
  DARKEN: true,
  MULTIPLY: true,
  LINEAR_BURN: true,
  COLOR_BURN: true,
  LIGHTEN: true,
  SCREEN: true,
  LINEAR_DODGE: true,
  COLOR_DODGE: true,
  OVERLAY: true,
  SOFT_LIGHT: true,
  HARD_LIGHT: true,
  DIFFERENCE: true,
  EXCLUSION: true,
  HUE: true,
  SATURATION: true,
  COLOR: true,
  LUMINOSITY: true,
  PASS_THROUGH: true
} satisfies Record<BlendMode, true>

export const BLEND_MODES = Object.keys(BLEND_MODE_KEYS) as BlendMode[]

/** Effect kinds Figma's plugin API accepts that Pairdraw does not model yet. */
const UNSUPPORTED_EFFECT_TYPES = new Set(['GLASS', 'SHADER'])

// Figma rejects Infinity as well as NaN ("Number must be finite").
const finiteSchema = v.pipe(v.number(), v.finite())
const unitSchema = v.pipe(finiteSchema, v.minValue(0), v.maxValue(1))
const nonNegativeSchema = v.pipe(finiteSchema, v.minValue(0))

// Figma keeps a grain size, and a texture's radius, above 100 at 100 rather than refusing it.
const GRAIN_MAX = 100
const grainSchema = v.pipe(
  nonNegativeSchema,
  v.transform((size) => Math.min(size, GRAIN_MAX))
)
const grainVectorSchema = v.optional(v.strictObject({ x: grainSchema, y: grainSchema }))

const colorSchema = v.strictObject({ r: unitSchema, g: unitSchema, b: unitSchema, a: unitSchema })
const vectorSchema = v.strictObject({ x: finiteSchema, y: finiteSchema })
// Variable bindings on effects are not supported; Figma reports an empty object.
const boundVariablesSchema = v.optional(v.strictObject({}))

const shadowEntries = {
  color: colorSchema,
  offset: vectorSchema,
  radius: nonNegativeSchema,
  spread: v.optional(finiteSchema),
  visible: v.boolean(),
  blendMode: v.picklist(BLEND_MODES),
  boundVariables: boundVariablesSchema
}

// A noise has no visible radius, yet only its radius binds, as on a blur (Figma 126).
const noiseEntries = {
  type: v.literal('NOISE'),
  visible: v.boolean(),
  boundVariables: boundVariablesSchema,
  noiseSize: grainSchema,
  noiseSizeVector: grainVectorSchema,
  color: colorSchema,
  density: unitSchema
}

const effectSchema = v.variant('type', [
  v.strictObject({
    type: v.literal('DROP_SHADOW'),
    ...shadowEntries,
    showShadowBehindNode: v.optional(v.boolean())
  }),
  v.strictObject({ type: v.literal('INNER_SHADOW'), ...shadowEntries }),
  v.strictObject({
    type: v.picklist(['LAYER_BLUR', 'BACKGROUND_BLUR']),
    radius: nonNegativeSchema,
    visible: v.boolean(),
    blurType: v.optional(v.literal('NORMAL'), 'NORMAL'),
    boundVariables: boundVariablesSchema
  }),
  v.variant('noiseType', [
    v.strictObject({ ...noiseEntries, noiseType: v.literal('MONOTONE') }),
    v.strictObject({
      ...noiseEntries,
      noiseType: v.literal('DUOTONE'),
      secondaryColor: colorSchema
    }),
    v.strictObject({ ...noiseEntries, noiseType: v.literal('MULTITONE'), opacity: unitSchema })
  ]),
  v.strictObject({
    type: v.literal('TEXTURE'),
    visible: v.boolean(),
    radius: grainSchema,
    boundVariables: boundVariablesSchema,
    noiseSize: grainSchema,
    noiseSizeVector: grainVectorSchema,
    clipToShape: v.boolean()
  })
])

const effectsSchema = v.array(effectSchema)

/** An effect as Figma's plugin API reads and writes it (`Effect` in `@figma/plugin-typings`). */
export type FigmaEffect = v.InferOutput<typeof effectSchema>

/** Figma's spelling of a path into a value: `[0].color.r`. */
export function issuePath(path: readonly v.IssuePathItem[] | undefined): string {
  return (path ?? [])
    .map((item) => (typeof item.key === 'number' ? `[${item.key}]` : `.${String(item.key)}`))
    .join('')
}

function unsupportedEffect(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  for (const [index, effect] of value.entries()) {
    const type: unknown = v.is(v.object({ type: v.unknown() }), effect) ? effect.type : undefined
    if (typeof type === 'string' && UNSUPPORTED_EFFECT_TYPES.has(type)) {
      return `${type} effects are not supported at [${index}].type`
    }
    if (v.is(v.object({ blurType: v.literal('PROGRESSIVE') }), effect)) {
      return `Progressive blur is not supported at [${index}].blurType`
    }
  }
  return null
}

/**
 * Figma's complaint about an effect whose `noiseSize` is not its `noiseSizeVector.x`, read from
 * the values it was given, or null. The vector's `y` may differ: that is how a grain is not square.
 */
function grainSizeMismatch(value: unknown): string | null {
  const grain = v.object({ noiseSize: v.number(), noiseSizeVector: v.object({ x: v.number() }) })
  if (!Array.isArray(value)) return null
  for (const effect of value) {
    if (!v.is(grain, effect) || effect.noiseSize === effect.noiseSizeVector.x) continue
    return `Effect noiseSize (${effect.noiseSize}) does not match noiseSizeVector.x (${effect.noiseSizeVector.x}). Ensure these values are consistent.`
  }
  return null
}

/**
 * `effects` with every texture after the first left out, as Figma silently keeps one. The effects
 * setter reads bindings from the same list, so their indexes match the effects it keeps.
 */
export function firstTextureOnly<T extends { readonly type: string }>(effects: readonly T[]): T[] {
  const first = effects.findIndex((effect) => effect.type === 'TEXTURE')
  return effects.filter((effect, index) => effect.type !== 'TEXTURE' || index === first)
}

/**
 * Check `value` against Figma's effect shapes and convert it to scene effects.
 * Throws with the first problem, as Figma's `effects` setter does.
 */
export function parseFigmaEffects(value: unknown): Effect[] {
  const unsupported = unsupportedEffect(value)
  if (unsupported) throw new Error(`Property "effects" failed validation: ${unsupported}`)
  const result = v.safeParse(effectsSchema, value)
  if (!result.success) {
    const [issue] = result.issues
    throw new Error(
      `Property "effects" failed validation: ${issue.message} at ${issuePath(issue.path) || 'effects'}`
    )
  }
  const mismatch = grainSizeMismatch(value)
  if (mismatch) throw new Error(`Property "effects" failed validation: ${mismatch}`)
  return firstTextureOnly(result.output).map(toSceneEffect)
}

/** `value` as scene effects when it holds valid Figma effects, or null. */
export function tryParseFigmaEffects(value: unknown): Effect[] | null {
  if (unsupportedEffect(value)) return null
  const result = v.safeParse(effectsSchema, value)
  if (!result.success) return null
  if (grainSizeMismatch(value)) return null
  return firstTextureOnly(result.output).map(toSceneEffect)
}

/** A grain size as both axes, from the vector when given, else the one number. */
function grainSize(effect: { noiseSize: number; noiseSizeVector?: Vector }): Vector {
  return effect.noiseSizeVector
    ? { ...effect.noiseSizeVector }
    : { x: effect.noiseSize, y: effect.noiseSize }
}

function toSceneEffect(effect: FigmaEffect): Effect {
  if (effect.type === 'NOISE') {
    const noise: NoiseEffectParams = {
      noiseType: effect.noiseType,
      noiseSize: grainSize(effect),
      density: effect.density
    }
    if (effect.noiseType === 'DUOTONE') noise.secondaryColor = { ...effect.secondaryColor }
    if (effect.noiseType === 'MULTITONE') noise.opacity = effect.opacity
    return { type: 'NOISE', color: { ...effect.color }, visible: effect.visible, noise }
  }
  if (effect.type === 'TEXTURE') {
    return {
      type: 'TEXTURE',
      // A `.fig` texture carries an opaque black colour it does not use.
      color: { ...BLACK },
      radius: effect.radius,
      visible: effect.visible,
      texture: { noiseSize: grainSize(effect), clipToShape: effect.clipToShape }
    }
  }
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    return {
      type: effect.type,
      color: { ...effect.color },
      offset: { ...effect.offset },
      radius: effect.radius,
      spread: effect.spread ?? 0,
      visible: effect.visible,
      // Figma accepts PASS_THROUGH on shadows but stores NORMAL; it is a layer blend mode.
      blendMode: effect.blendMode === 'PASS_THROUGH' ? 'NORMAL' : effect.blendMode,
      ...(effect.type === 'DROP_SHADOW' && effect.showShadowBehindNode !== undefined
        ? { showShadowBehindNode: effect.showShadowBehindNode }
        : {})
    }
  }
  return {
    type: effect.type,
    color: { ...TRANSPARENT },
    offset: { x: 0, y: 0 },
    radius: effect.radius,
    spread: 0,
    visible: effect.visible
  }
}

/** A scene effect in the shape Figma's `effects` getter returns. */
export function toFigmaEffect(effect: Exclude<Effect, ShaderEffect>): FigmaEffect {
  if (effect.type === 'NOISE') return figmaNoiseEffect(effect)
  if (effect.type === 'TEXTURE') return figmaTextureEffect(effect)
  if (
    effect.type === 'LAYER_BLUR' ||
    effect.type === 'FOREGROUND_BLUR' ||
    effect.type === 'BACKGROUND_BLUR'
  ) {
    return {
      // `.fig` files call a layer blur FOREGROUND_BLUR; the plugin API calls it LAYER_BLUR.
      type: effect.type === 'BACKGROUND_BLUR' ? 'BACKGROUND_BLUR' : 'LAYER_BLUR',
      visible: effect.visible,
      radius: effect.radius,
      boundVariables: {},
      blurType: 'NORMAL'
    }
  }
  const shadow = {
    visible: effect.visible,
    radius: effect.radius,
    boundVariables: {},
    color: { ...effect.color },
    offset: { ...effect.offset },
    spread: effect.spread,
    blendMode: effect.blendMode ?? 'NORMAL'
  }
  return effect.type === 'DROP_SHADOW'
    ? {
        type: 'DROP_SHADOW',
        ...shadow,
        // The renderer draws the shadow behind the node unless this is `false`.
        showShadowBehindNode: effect.showShadowBehindNode ?? true
      }
    : { type: 'INNER_SHADOW', ...shadow }
}

/** A scene noise effect as Figma's `effects` getter returns it, each noise type with its field. */
function figmaNoiseEffect(effect: NoiseEffect): FigmaEffect {
  const noise = effect.noise
  const base = {
    type: 'NOISE' as const,
    visible: effect.visible,
    boundVariables: {},
    noiseSize: noise.noiseSize.x,
    noiseSizeVector: { ...noise.noiseSize },
    color: { ...effect.color },
    density: noise.density
  }
  if (noise.noiseType === 'DUOTONE') {
    const secondaryColor = { ...(noise.secondaryColor ?? effect.color) }
    return { ...base, noiseType: 'DUOTONE', secondaryColor }
  }
  if (noise.noiseType === 'MULTITONE') {
    return { ...base, noiseType: 'MULTITONE', opacity: noise.opacity ?? 1 }
  }
  return { ...base, noiseType: 'MONOTONE' }
}

/** A scene texture effect as Figma's `effects` getter returns it. */
function figmaTextureEffect(effect: TextureEffect): FigmaEffect {
  const texture = effect.texture
  return {
    type: 'TEXTURE',
    visible: effect.visible,
    radius: effect.radius,
    boundVariables: {},
    noiseSize: texture.noiseSize.x,
    noiseSizeVector: { ...texture.noiseSize },
    clipToShape: texture.clipToShape
  }
}
