<script setup lang="ts">
import { tv } from 'tailwind-variants'

import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'
import layoutCheckboxRowTheme from '@/theme/layout-checkbox-row'

/**
 * A labelled checkbox in the layout section, such as Clip content; mixed shows as indeterminate.
 * Attributes such as `data-test-id` go to the checkbox itself.
 */
defineOptions({ inheritAttrs: false })

const { modelValue, label } = defineProps<{
  modelValue: boolean | 'indeterminate'
  label: string
}>()

const emit = defineEmits<{ toggle: [] }>()

const styles = tv(layoutCheckboxRowTheme)()
</script>

<template>
  <label :class="styles.root()">
    <AppCheckbox
      :model-value="modelValue"
      :ariaLabel="label"
      v-bind="$attrs"
      @update:model-value="emit('toggle')"
    />
    {{ label }}
  </label>
</template>
