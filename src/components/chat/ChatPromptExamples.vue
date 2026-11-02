<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, normalizeClass, type Component, type HTMLAttributes } from 'vue'
import IconLayoutDashboard from '~icons/lucide/layout-dashboard'
import IconLayoutTemplate from '~icons/lucide/layout-template'
import IconLogIn from '~icons/lucide/log-in'
import IconTag from '~icons/lucide/tag'

import { useI18n } from '@open-pencil/vue/i18n'

import { promptExamples, type PromptExampleId } from '@/app/ai/chat/entry/examples'
import AppButton from '@/components/ui/button/AppButton.vue'
import type { ComponentUI } from '@/components/ui/types'
import theme, { type PromptExamplesTheme } from '@/theme/chat/prompt-examples'

/**
 * Example prompts for a first ask, on Home and over an empty page. Picking one hands its prompt
 * to the composer to read and edit before sending, so nothing runs on a single click.
 */
const {
  disabled = false,
  class: className,
  ui
} = defineProps<{
  /** A prompt is on its way, such as while the AI setup it waits for is open. */
  disabled?: boolean
  class?: HTMLAttributes['class']
  ui?: ComponentUI<PromptExamplesTheme>
}>()
const emit = defineEmits<{ pick: [prompt: string] }>()
const { ai } = useI18n()
const examples = computed(() => promptExamples(ai.value))
const icons: Record<PromptExampleId, Component> = {
  landing: IconLayoutTemplate,
  signIn: IconLogIn,
  dashboard: IconLayoutDashboard,
  pricing: IconTag
}
const styles = tv(theme)()
</script>

<template>
  <ul
    :aria-label="ai.promptExamples"
    :class="styles.root({ class: [ui?.root, normalizeClass(className)] })"
  >
    <li v-for="example in examples" :key="example.id" :class="styles.item({ class: ui?.item })">
      <AppButton
        variant="subtle"
        shape="pill"
        size="sm"
        :disabled="disabled"
        :data-example="example.id"
        @click="emit('pick', example.prompt)"
      >
        <component :is="icons[example.id]" :class="styles.icon({ class: ui?.icon })" />
        {{ example.label }}
      </AppButton>
    </li>
  </ul>
</template>
