<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { APP_NAME } from '@/constants'
import brandMarkTheme from '@/theme/brand'

import type { BrandMarkProps } from './types'

const brandMark = tv(brandMarkTheme)

const {
  variant = 'micro',
  appearance = 'light',
  decorative = false,
  class: className
} = defineProps<BrandMarkProps>()

const sources = {
  mark: 'mark',
  micro: 'mark-micro',
  mono: 'mark-mono',
  'app-icon': 'app-icon'
} as const
const source = computed(() => {
  // The orange tile owns its background and draws the same white mark in both themes.
  const suffix = variant !== 'app-icon' && appearance === 'dark' ? '-dark' : ''
  return `/brand/${sources[variant]}${suffix}.svg`
})
</script>

<template>
  <img
    :src="source"
    :class="brandMark({ class: className })"
    :alt="decorative ? '' : APP_NAME"
    width="16"
    height="16"
  />
</template>
