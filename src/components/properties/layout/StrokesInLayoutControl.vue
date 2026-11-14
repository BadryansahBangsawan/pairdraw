<script setup lang="ts">
import { computed } from 'vue'

import { MIXED } from '@pairdraw/vue/controls/node-props'
import { useSelectionLayout } from '@pairdraw/vue/controls/selection-layout'
import { useI18n } from '@pairdraw/vue/i18n'

import LayoutCheckboxRow from './LayoutCheckboxRow.vue'

/** Whether the selected auto layouts make room for strokes, as Figma's "Strokes: Included in layout". */
const layout = useSelectionLayout()
const { panels } = useI18n()

const state = computed(() => {
  const included = layout.strokesIncludedInLayout.value
  return included === MIXED ? 'indeterminate' : included === true
})
</script>

<template>
  <LayoutCheckboxRow
    v-if="layout.strokesIncludedInLayout.value !== undefined"
    data-property="strokesIncludedInLayout"
    :model-value="state"
    :label="panels.strokesIncludedInLayout"
    @toggle="layout.toggleStrokesIncludedInLayout()"
  />
</template>
