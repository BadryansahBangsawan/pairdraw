<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import type { AIModelProfile } from '@/app/ai/models'
import { profileLogoSource } from '@/app/ai/models/provider-logo'
import ProviderLogo from '@/components/settings/provider/ProviderLogo.vue'

import { chatProfileTheme } from './ui'

const { profile, metadata } = defineProps<{
  profile: AIModelProfile
  metadata: string
}>()

const { ai } = useI18n()
const ui = chatProfileTheme()
</script>

<template>
  <span class="contents">
    <ProviderLogo v-bind="profileLogoSource(profile)" />
    <span :class="ui.text()">
      <span :class="ui.name()">{{ profile.name || ai.designModelName }}</span>
      <span :class="ui.metadata()">{{ metadata }}</span>
    </span>
    <span
      :class="ui.capability()"
      :aria-label="profile.capabilities.includes('vision') ? 'Supports image input' : undefined"
    >
      <icon-lucide-eye
        v-if="profile.capabilities.includes('vision')"
        class="size-full"
        aria-hidden="true"
      />
    </span>
  </span>
</template>
