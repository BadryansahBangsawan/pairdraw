<script setup lang="ts">
import { computed } from 'vue'

import type { ArcField } from '@open-pencil/core/geometry'
import { useEditorMessages, usePanelMessages } from '@open-pencil/vue/i18n'

import NumberField from '@/components/inputs/NumberField.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'

/**
 * An ellipse's arc as numbers, the values its on-canvas handles show: where it starts in degrees,
 * how far it sweeps in percent of a turn, and its inner ratio in percent of the radius. A field
 * the selected ellipses differ in shows as mixed.
 */
const { start, sweep, ratio } = defineProps<{
  start: number | symbol
  sweep: number | symbol
  ratio: number | symbol
}>()

const emit = defineEmits<{
  /** A value while it is scrubbed or typed, before it is committed. */
  update: [field: ArcField, value: number]
  commit: [field: ArcField, value: number]
  cancel: []
}>()

const editor = useEditorMessages()
const panels = usePanelMessages()

const fields = computed(
  () =>
    [
      {
        key: 'start',
        label: editor.value.arcStart,
        value: start,
        suffix: '°',
        min: -360,
        max: 360
      },
      {
        key: 'sweep',
        label: editor.value.arcSweep,
        value: sweep,
        suffix: '%',
        min: -100,
        max: 100
      },
      { key: 'ratio', label: editor.value.arcRatio, value: ratio, suffix: '%', min: 0, max: 100 }
    ] as const
)
</script>

<template>
  <div role="group" :aria-label="panels.arc" data-property="arc">
    <PanelGrid :columns="3">
      <PanelFieldGroup v-for="field in fields" :key="field.key" :label="field.label">
        <NumberField
          :model-value="field.value"
          :min="field.min"
          :max="field.max"
          :step="0.1"
          :suffix="field.suffix"
          :placeholder="panels.mixed"
          :aria-label="field.label"
          :data-property="`arc-${field.key}`"
          @update:model-value="emit('update', field.key, $event)"
          @commit="(value: number) => emit('commit', field.key, value)"
          @cancel="emit('cancel')"
        />
      </PanelFieldGroup>
    </PanelGrid>
  </div>
</template>
