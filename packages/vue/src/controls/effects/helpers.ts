import type { Ref } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { Effect, SceneNode, ShadowEffect } from '@open-pencil/scene-graph'
import { copyEffects } from '@open-pencil/scene-graph/copy'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { useI18n } from '#vue/i18n/useI18n.js'

type EffectType = Effect['type']

const { panels } = useI18n()

const EFFECT_LABELS: Record<string, string> = {
  DROP_SHADOW: panels.value.dropShadow,
  INNER_SHADOW: panels.value.innerShadow,
  LAYER_BLUR: panels.value.layerBlur,
  BACKGROUND_BLUR: panels.value.backgroundBlur,
  FOREGROUND_BLUR: panels.value.foregroundBlur,
  SHADER: panels.value.shader
}

/** The code a new layer shader starts from: it tints the layer it sits on. */
export const DEFAULT_SHADER_SOURCE = `uniform sampler2D layer; /* @object */
uniform vec2 resolution; /* @resolution */
uniform vec4 tint; /* @color @default #ff7a45 */

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 color = texture2D(layer, uv);
  gl_FragColor = vec4(mix(color.rgb, tint.rgb, tint.a), color.a);
}`

export const EFFECT_TYPES = Object.keys(EFFECT_LABELS) as EffectType[]
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
  function apply(nodes: readonly SceneNode[], index: number, changes: Partial<Effect>) {
    for (const node of nodes) {
      const effects = [...node.effects]
      const current = effects.at(index)
      if (!current) continue
      effects[index] = { ...current, ...changes } as Effect
      editor.updateNode(node.id, { effects })
    }
    editor.requestRender()
  }

  function scrubEffect(nodes: readonly SceneNode[], index: number, changes: Partial<Effect>) {
    if (nodes.length === 0) return
    effectsBeforeScrub.value ??= new Map(
      nodes.map((node) => [
        node.id,
        { effects: copyEffects(node.effects), effectStyleId: node.effectStyleId }
      ])
    )
    apply(nodes, index, changes)
  }

  function commitEffect(nodes: readonly SceneNode[], index: number, changes: Partial<Effect>) {
    if (nodes.length === 0) return
    const previous = effectsBeforeScrub.value
    effectsBeforeScrub.value = null
    apply(nodes, index, changes)
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

export function createEffectControlActions(expandedIndex: Ref<number | null>) {
  function updateType(
    patch: (index: number, changes: Partial<Effect>) => void,
    node: SceneNode | null,
    index: number,
    type: EffectType
  ) {
    if (!node) return
    const previous = node.effects[index]
    if (type === 'SHADER') {
      patch(
        index,
        previous.type === 'SHADER'
          ? { type }
          : { type, source: DEFAULT_SHADER_SOURCE, uniforms: {} }
      )
      return
    }
    // A shadow blurs away from the layer; a blur is centred on it. Switching between the two
    // always rewrites the geometry, so the moment the type changes the offsets match it.
    const shadow = isShadow(type)
    const wasShadow = previous.type !== 'SHADER' && isShadow(previous.type)
    let geometry: Partial<ShadowEffect> = {}
    if (shadow !== wasShadow) {
      geometry = shadow
        ? { offset: { x: 0, y: 4 }, spread: 0 }
        : { offset: { x: 0, y: 0 }, spread: 0 }
    }
    patch(index, { ...geometry, type })
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
