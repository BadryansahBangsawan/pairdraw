<script setup lang="ts">
import { computed } from 'vue'

import type { DocumentColorSpace } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { useColorModel } from '@pairdraw/vue/controls/color-model'
import { useDocumentColorSpace } from '@pairdraw/vue/controls/document-colors'
import { inputValue } from '@pairdraw/vue/shared/dom-events'

import { BindingPill } from '@/components/ui/binding'

const {
  color,
  resolvedColor,
  variableName,
  unavailableLabel,
  label,
  deleted,
  deletedLabel,
  colorProfile
} = defineProps<{
  color: Color
  resolvedColor?: Color
  unavailableLabel?: string
  variableName?: string
  label: string
  deleted?: boolean
  deletedLabel?: string
  /** The profile the color is stored in; the open document's unless one is given. */
  colorProfile?: DocumentColorSpace
}>()
const emit = defineEmits<{ update: [color: Color] }>()

const displayColor = computed(() => resolvedColor ?? color)
const documentColorSpace = useDocumentColorSpace()
// A design's colors are stored in its document's profile, so the hex reads as sRGB and typing
// stores sRGB back into that profile.
const profile = computed(() => colorProfile ?? documentColorSpace.value)
const model = useColorModel({
  color: displayColor,
  colorProfile: () => profile.value,
  onUpdate: (updated) => emit('update', updated)
})
const tooltip = computed(() => (variableName ? `${variableName} · #${model.hex.value}` : undefined))
</script>

<template>
  <BindingPill
    v-if="variableName || unavailableLabel"
    class="min-w-0 flex-1"
    :label="variableName ?? unavailableLabel ?? label"
    :unresolved="!!unavailableLabel"
    :tooltip="unavailableLabel ?? tooltip"
    :deleted="deleted"
    :deleted-label="deletedLabel"
  />
  <input
    v-else
    :aria-label="label"
    data-property="color-hex"
    class="min-w-0 flex-1 border-none bg-transparent font-mono text-[11px] text-surface outline-none"
    :value="model.hex.value"
    maxlength="6"
    @change="model.updateHex(inputValue($event))"
  />
</template>
