<script setup lang="ts">
import { computed } from 'vue'

import type { Color } from '@pairdraw/scene-graph/primitives'
import { useColorModel } from '@pairdraw/vue/controls/color-model'
import { inputValue } from '@pairdraw/vue/shared/dom-events'

import { BindingPill } from '@/components/ui/binding'

const { color, resolvedColor, variableName, unavailableLabel, label, deleted, deletedLabel } =
  defineProps<{
    color: Color
    resolvedColor?: Color
    unavailableLabel?: string
    variableName?: string
    label: string
    deleted?: boolean
    deletedLabel?: string
  }>()
const emit = defineEmits<{ update: [color: Color] }>()

const displayColor = computed(() => resolvedColor ?? color)
const model = useColorModel({
  color: displayColor,
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
