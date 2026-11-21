<script setup lang="ts">
import { computed } from 'vue'

import { providerLogo } from '@/app/ai/models/provider-logo'

import ProviderLogoMark from './ProviderLogoMark.vue'

const {
  provider,
  model,
  class: className
} = defineProps<{
  /** A provider, coding agent, or server preset such as `ollama`. */
  provider: string
  /** The model a profile runs: a router such as OpenRouter then shows the model's maker. */
  model?: string
  class?: string
}>()

const logo = computed(() => providerLogo(provider, model))
</script>

<template>
  <ProviderLogoMark :logo="logo" :class="className" />
</template>
