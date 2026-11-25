<script setup lang="ts">
import { computed } from 'vue'

import type { DocumentColorSpace, Fill } from '@pairdraw/scene-graph'

import type { FillRootSlots } from './types'
import { useFill } from './useFill'

const { fill, colorProfile } = defineProps<{ fill: Fill; colorProfile?: DocumentColorSpace }>()
const emit = defineEmits<{ update: [fill: Fill] }>()
defineSlots<FillRootSlots>()

const model = useFill(
  computed(() => fill),
  (updated) => emit('update', updated),
  { colorProfile: () => colorProfile }
)
</script>

<template>
  <slot
    :fill="fill"
    :category="model.category.value"
    :swatch-background="model.swatchBackground.value"
    :transparent="model.transparent.value"
    :actions="model.actions"
  />
</template>
