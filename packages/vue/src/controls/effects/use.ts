import { ref, shallowRef } from 'vue'

import {
  EFFECT_OPTIONS,
  createDefaultEffect,
  createEffectControlActions,
  createEffectEditActions,
  isShadow,
  isShadowEffect,
  noiseChange,
  noiseTypeChange,
  textureChange,
  type EffectChange,
  type EffectEditSnapshot
} from '#vue/controls/effects/helpers'
import { useNodeProps } from '#vue/controls/node-props/use'
import { useEditor } from '#vue/editor/context'

/**
 * Returns effect-editing helpers for property panels.
 *
 * This composable manages default effect creation, expanded-row state,
 * scrub-preview behavior, and effect type/color updates.
 */
export function useEffectsControls() {
  const editor = useEditor()

  const expandedIndex = ref<number | null>(null)
  const { nodes } = useNodeProps()
  const effectsBeforeScrub = shallowRef<Map<string, EffectEditSnapshot> | null>(null)
  const editActions = createEffectEditActions(editor, effectsBeforeScrub)
  const controlActions = createEffectControlActions(expandedIndex)

  return {
    expandedIndex,
    effectOptions: EFFECT_OPTIONS,
    createDefaultEffect,
    isShadow,
    isShadowEffect,
    noiseChange,
    noiseTypeChange,
    textureChange,
    /** Previews a change to one effect on every selected layer. */
    scrubEffect: (index: number, change: EffectChange) =>
      editActions.scrubEffect(nodes.value, index, change),
    /** Applies a change to one effect on every selected layer in one undo step. */
    commitEffect: (index: number, change: EffectChange) =>
      editActions.commitEffect(nodes.value, index, change),
    ...controlActions
  }
}
