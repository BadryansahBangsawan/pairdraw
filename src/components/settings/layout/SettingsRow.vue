<script setup lang="ts">
import { Primitive } from 'reka-ui'
import { tv } from 'tailwind-variants'

import theme from '@/theme/settings/layout'

import SettingsResetButton from './SettingsResetButton.vue'

/**
 * One line of a `SettingsGroup`: a label, an optional description, and its control on the right.
 * As a `label`, clicking the text works the control, as a switch row does. A `modified` row offers
 * Reset to default before its control, emitting `reset`.
 */
const {
  label,
  description,
  as = 'div',
  modified = false
} = defineProps<{
  label?: string
  description?: string
  as?: 'div' | 'label'
  /** The setting differs from its default. */
  modified?: boolean
}>()
const emit = defineEmits<{ reset: [] }>()
const styles = tv(theme)()
</script>

<template>
  <Primitive :as="as" :class="styles.row()" data-slot="settings-row">
    <span :class="styles.rowText()">
      <span :class="styles.rowLabel()"
        ><slot name="label">{{ label }}</slot></span
      >
      <span v-if="description" :class="styles.rowDescription()">{{ description }}</span>
      <slot name="description" />
    </span>
    <span :class="styles.rowControl()">
      <SettingsResetButton v-if="modified" @reset="emit('reset')" />
      <slot />
    </span>
  </Primitive>
</template>
