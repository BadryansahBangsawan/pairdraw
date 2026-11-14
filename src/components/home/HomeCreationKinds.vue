<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, type Component } from 'vue'
import IconAppWindow from '~icons/lucide/app-window'
import IconFilePlus from '~icons/lucide/file-plus-2'
import IconLayoutDashboard from '~icons/lucide/layout-dashboard'
import IconLayoutTemplate from '~icons/lucide/layout-template'
import IconPresentation from '~icons/lucide/presentation'
import IconSmartphone from '~icons/lucide/smartphone'

import { useI18n } from '@pairdraw/vue/i18n'

import { creationKinds, type CreationKindId } from '@/app/home/creation'
import AppButton from '@/components/ui/button/AppButton.vue'
import theme from '@/theme/home/creation'

/**
 * What the prompt below is going to make. One kind is chosen at a time, and the choice adds that
 * kind's guide for the agent when the prompt is sent; "Something else" sends the prompt alone.
 */
const kind = defineModel<CreationKindId>({ required: true })
const { disabled = false } = defineProps<{ disabled?: boolean }>()
const { ai } = useI18n()
const kinds = computed(() => creationKinds(ai.value))
const icons: Record<CreationKindId, Component> = {
  landing: IconLayoutTemplate,
  mobile: IconSmartphone,
  web: IconAppWindow,
  slides: IconPresentation,
  dashboard: IconLayoutDashboard,
  other: IconFilePlus
}
const styles = tv(theme)()
</script>

<template>
  <ul :aria-label="ai.creationKinds" :class="styles.kinds()">
    <li v-for="choice in kinds" :key="choice.id" :class="styles.kind()">
      <AppButton
        :variant="choice.id === kind ? 'outline' : 'subtle'"
        shape="pill"
        size="sm"
        :disabled="disabled"
        :aria-pressed="choice.id === kind"
        :data-kind="choice.id"
        data-test-id="home-creation-kind"
        @click="kind = choice.id"
      >
        <component :is="icons[choice.id]" :class="styles.kindIcon()" />
        {{ choice.label }}
      </AppButton>
    </li>
  </ul>
</template>
