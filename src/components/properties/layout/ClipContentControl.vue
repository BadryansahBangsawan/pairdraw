<script setup lang="ts">
import { computed } from 'vue'

import { MIXED } from '@open-pencil/vue/controls/node-props'
import { useSelectionLayout } from '@open-pencil/vue/controls/selection-layout'
import { useI18n } from '@open-pencil/vue/i18n'

import LayoutCheckboxRow from './LayoutCheckboxRow.vue'

const layout = useSelectionLayout()
const { panels } = useI18n()

const state = computed(() => {
  const clips = layout.clipsContent.value
  return clips === MIXED ? 'indeterminate' : clips === true
})
</script>

<template>
  <LayoutCheckboxRow
    :model-value="state"
    :label="panels.clipContent"
    data-test-id="clip-content-checkbox"
    @toggle="layout.toggleClipsContent()"
  />
</template>
