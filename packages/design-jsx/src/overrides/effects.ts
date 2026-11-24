import * as v from 'valibot'

import type { DocumentColorSpace, SceneNode } from '@pairdraw/scene-graph'
import { colorSchema } from '@pairdraw/scene-graph/color'
import { TRANSPARENT } from '@pairdraw/scene-graph/constants'
import { parseCSSShadows } from '@pairdraw/scene-graph/css'
import { normalizeEffects } from '@pairdraw/scene-graph/effects'
import { finiteNumberSchema, type Vector } from '@pairdraw/scene-graph/primitives'
import { shaderUniformValueSchema } from '@pairdraw/scene-graph/shaders'

import { BLEND_MODE, enumProp } from '../enums'
import { parseScriptInput } from '../schema'

const offsetSchema = v.object({
  x: v.optional(finiteNumberSchema),
  y: v.optional(finiteNumberSchema)
})

const effectFields = {
  radius: finiteNumberSchema,
  offset: v.optional(offsetSchema),
  spread: v.optional(finiteNumberSchema, 0),
  visible: v.optional(v.boolean(), true),
  blendMode: v.optional(enumProp(BLEND_MODE)),
  showShadowBehindNode: v.optional(v.boolean())
}

const SHADOW_TYPES = ['DROP_SHADOW', 'INNER_SHADOW'] as const
const BLUR_TYPES = ['LAYER_BLUR', 'BACKGROUND_BLUR', 'FOREGROUND_BLUR'] as const

function shadowEffectSchema(type: (typeof SHADOW_TYPES)[number]) {
  return v.object({
    type: v.literal(type),
    color: colorSchema,
    ...effectFields
  })
}

function blurEffectSchema(type: (typeof BLUR_TYPES)[number]) {
  return v.object({
    type: v.literal(type),
    color: v.optional(colorSchema),
    ...effectFields
  })
}

const shaderEffectSchema = v.object({
  type: v.literal('SHADER'),
  source: v.pipe(v.string(), v.minLength(1)),
  uniforms: v.optional(v.record(v.string(), shaderUniformValueSchema)),
  uniformBindings: v.optional(v.record(v.string(), v.string())),
  visible: v.optional(v.boolean(), true),
  blendMode: v.optional(enumProp(BLEND_MODE))
})

const effectSchema = v.variant('type', [
  shadowEffectSchema('DROP_SHADOW'),
  shadowEffectSchema('INNER_SHADOW'),
  blurEffectSchema('LAYER_BLUR'),
  blurEffectSchema('BACKGROUND_BLUR'),
  blurEffectSchema('FOREGROUND_BLUR'),
  shaderEffectSchema
])

const effectsSchema = v.array(effectSchema)

type ParsedEffect = v.InferOutput<typeof effectSchema>
type NormalizableEffect = Parameters<typeof normalizeEffects>[0][number]
type StoredShadow = Exclude<NormalizableEffect, { type: 'SHADER' }>

/** Drop an omitted offset so `normalizeEffects` can apply the shadow or blur default. */
function forNormalize(effect: ParsedEffect): NormalizableEffect {
  if (effect.type === 'SHADER') {
    const shader: Extract<NormalizableEffect, { type: 'SHADER' }> = {
      type: 'SHADER',
      source: effect.source,
      visible: effect.visible
    }
    if (effect.uniforms !== undefined) shader.uniforms = effect.uniforms
    if (effect.uniformBindings !== undefined) shader.uniformBindings = effect.uniformBindings
    if (effect.blendMode !== undefined) shader.blendMode = effect.blendMode
    return shader
  }
  const shadow: StoredShadow = {
    type: effect.type,
    color: effect.color ?? { ...TRANSPARENT },
    radius: effect.radius,
    spread: effect.spread,
    visible: effect.visible
  }
  if (effect.offset !== undefined) {
    const offset: Partial<Vector> = {}
    if (effect.offset.x !== undefined) offset.x = effect.offset.x
    if (effect.offset.y !== undefined) offset.y = effect.offset.y
    shadow.offset = offset
  }
  if (effect.blendMode !== undefined) shadow.blendMode = effect.blendMode
  if (effect.showShadowBehindNode !== undefined) {
    shadow.showShadowBehindNode = effect.showShadowBehindNode
  }
  return shadow
}

/** `effects` takes structured effects; `shadow` appends its shadows and `blur` a layer blur. */
export function applyEffectOverrides(
  props: Record<string, unknown>,
  o: Partial<SceneNode>,
  profile: DocumentColorSpace = 'srgb'
): void {
  if (Array.isArray(props.effects) && props.effects.length > 0) {
    const effects = parseScriptInput('effects', effectsSchema, props.effects).map(forNormalize)
    o.effects = normalizeEffects(effects)
  }

  // A CSS shadow list, as `box-shadow` takes it.
  const shadows = typeof props.shadow === 'string' ? parseCSSShadows(props.shadow, profile) : []
  if (shadows.length > 0) o.effects = [...(o.effects ?? []), ...shadows]

  if (typeof props.blur === 'number') {
    o.effects = [
      ...(o.effects ?? []),
      {
        type: 'LAYER_BLUR',
        radius: props.blur,
        visible: true,
        color: { ...TRANSPARENT },
        offset: { x: 0, y: 0 },
        spread: 0
      }
    ]
  }
}
