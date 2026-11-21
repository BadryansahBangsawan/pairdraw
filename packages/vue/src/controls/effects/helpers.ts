import type { Ref } from 'vue'

import type { Editor } from '@pairdraw/core'
import type {
  Effect,
  NoiseEffectParams,
  SceneNode,
  ShadowEffect,
  TextureEffectParams
} from '@pairdraw/scene-graph'
import {
  BLACK,
  DEFAULT_NOISE,
  DEFAULT_NOISE_COLOR,
  DEFAULT_TEXTURE,
  UNSET_NOISE,
  UNSET_TEXTURE
} from '@pairdraw/scene-graph/constants'
import { copyEffects } from '@pairdraw/scene-graph/copy'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { useI18n } from '#vue/i18n/useI18n.js'

type EffectType = Effect['type']

/**
 * One change to an effect: values to merge, or a function that reads the layer's own effect and
 * returns only what it changes, so every selected layer keeps its other values.
 */
export type EffectChange = Partial<Effect> | ((current: Effect) => Partial<Effect>)

/** A noise value change that keeps every other grain value the layer has. */
export function noiseChange(changes: Partial<NoiseEffectParams>): EffectChange {
  return (current) => {
    const noise = current.type === 'NOISE' ? current.noise : UNSET_NOISE
    return { noise: { ...noise, ...changes } }
  }
}

/** A texture value change that keeps every other grain value the layer has. */
export function textureChange(changes: Partial<TextureEffectParams>): EffectChange {
  return (current) => {
    const texture = current.type === 'TEXTURE' ? current.texture : UNSET_TEXTURE
    return { texture: { ...texture, ...changes } }
  }
}

/** A change of a noise's type, which also keeps the grain square. */
export function noiseTypeChange(type: NoiseEffectParams['noiseType']): EffectChange {
  return noiseChange({ noiseType: type })
}

const { panels } = useI18n()

const EFFECT_LABELS: Record<string, string> = {
  DROP_SHADOW: panels.value.dropShadow,
  INNER_SHADOW: panels.value.innerShadow,
  LAYER_BLUR: panels.value.layerBlur,
  BACKGROUND_BLUR: panels.value.backgroundBlur,
  FOREGROUND_BLUR: panels.value.foregroundBlur,
  NOISE: panels.value.noise,
  TEXTURE: panels.value.texture,
  SHADER: panels.value.shader
}

/** Radius of a shadow or blur that does not set one. */
const DEFAULT_EFFECT_RADIUS = 8

/** The code a new layer shader starts from: it tints the layer it sits on. */
const DEFAULT_SHADER_SOURCE = `uniform sampler2D layer; /* @object */
uniform vec2 resolution; /* @resolution */
uniform vec4 tint; /* @color @default #ff7a45 */

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 color = texture2D(layer, uv);
  gl_FragColor = vec4(mix(color.rgb, tint.rgb, tint.a), color.a);
}`

const EFFECT_TYPES = Object.keys(EFFECT_LABELS) as EffectType[]
export const EFFECT_OPTIONS = EFFECT_TYPES.map((t) => ({
  value: t,
  label: EFFECT_LABELS[t]
}))

export function isShadow(type: Effect['type']): type is ShadowEffect['type'] {
  return type === 'DROP_SHADOW' || type === 'INNER_SHADOW'
}

export function isShadowEffect(effect: Effect): effect is ShadowEffect {
  return isShadow(effect.type)
}

export function createDefaultEffect(): Effect {
  return {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 4,
    spread: 0,
    visible: true
  }
}

export interface EffectEditSnapshot {
  effects: Effect[]
  effectStyleId: string | null
}

/** Effects scrubbed on every selected node, each committed from its own value before the scrub. */
export function createEffectEditActions(
  editor: Editor,
  effectsBeforeScrub: Ref<Map<string, EffectEditSnapshot> | null>
) {
  function apply(nodes: readonly SceneNode[], index: number, change: EffectChange) {
    for (const node of nodes) {
      const effects = [...node.effects]
      const current = effects.at(index)
      if (!current) continue
      const changes = typeof change === 'function' ? change(current) : change
      effects[index] = { ...current, ...changes } as Effect
      editor.updateNode(node.id, { effects })
    }
    editor.requestRender()
  }

  function scrubEffect(nodes: readonly SceneNode[], index: number, change: EffectChange) {
    if (nodes.length === 0) return
    effectsBeforeScrub.value ??= new Map(
      nodes.map((node) => [
        node.id,
        { effects: copyEffects(node.effects), effectStyleId: node.effectStyleId }
      ])
    )
    apply(nodes, index, change)
  }

  function commitEffect(nodes: readonly SceneNode[], index: number, change: EffectChange) {
    if (nodes.length === 0) return
    const previous = effectsBeforeScrub.value
    effectsBeforeScrub.value = null
    apply(nodes, index, change)
    if (!previous) return
    editor.undo.runBatch('Change effect', () => {
      for (const node of nodes) {
        const before = previous.get(node.id)
        if (!before) continue
        editor.commitNodeUpdate(
          node.id,
          { effects: before.effects, effectStyleId: before.effectStyleId },
          'Change effect'
        )
      }
    })
  }

  return { scrubEffect, commitEffect }
}

/**
 * `type` as a complete effect, keeping what every kind can carry. A shadow blurs away from the
 * layer and a blur is centred on it, so switching between the two rewrites the geometry; a noise
 * or texture starts where Figma's effects panel starts one.
 */
function effectOfType(type: EffectType, previous: Effect): Effect {
  const blendMode = previous.blendMode
  const visible = previous.visible
  if (type === 'SHADER') {
    return { type, source: DEFAULT_SHADER_SOURCE, uniforms: {}, visible, blendMode }
  }
  if (type === 'NOISE') {
    return {
      type,
      color: { ...DEFAULT_NOISE_COLOR },
      visible,
      blendMode,
      noise: { ...DEFAULT_NOISE, noiseSize: { ...DEFAULT_NOISE.noiseSize } }
    }
  }
  if (type === 'TEXTURE') {
    return {
      type,
      color: { ...BLACK },
      radius: DEFAULT_TEXTURE.noiseSize.x,
      visible,
      blendMode,
      texture: { ...DEFAULT_TEXTURE, noiseSize: { ...DEFAULT_TEXTURE.noiseSize } }
    }
  }
  const radius =
    previous.type === 'SHADER' || previous.type === 'NOISE'
      ? DEFAULT_EFFECT_RADIUS
      : previous.radius
  return {
    type,
    color: previous.type === 'SHADER' ? { ...BLACK } : { ...previous.color },
    radius,
    spread: 0,
    offset: isShadow(type) ? { x: 0, y: 4 } : { x: 0, y: 0 },
    visible,
    blendMode
  }
}

export function createEffectControlActions(expandedIndex: Ref<number | null>) {
  function updateType(
    patch: (index: number, changes: Partial<Effect>) => void,
    node: SceneNode | null,
    index: number,
    type: EffectType
  ) {
    if (!node) return
    const previous = node.effects[index]
    if (type === previous.type) return
    patch(index, effectOfType(type, previous))
  }

  function updateColor(
    patch: (index: number, changes: Partial<Effect>) => void,
    index: number,
    color: Color
  ) {
    patch(index, { color })
  }

  function adjustExpandedAfterRemove(index: number) {
    if (expandedIndex.value === index) expandedIndex.value = null
    else if (expandedIndex.value !== null && expandedIndex.value > index) expandedIndex.value--
  }

  function handleRemove(removeFn: (index: number) => void, index: number) {
    removeFn(index)
    adjustExpandedAfterRemove(index)
  }

  function toggleExpand(index: number) {
    expandedIndex.value = expandedIndex.value === index ? null : index
  }

  return { updateType, updateColor, handleRemove, adjustExpandedAfterRemove, toggleExpand }
}
