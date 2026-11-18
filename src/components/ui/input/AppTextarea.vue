<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, useTemplateRef } from 'vue'

import theme from '@/theme/input/textarea'

const model = defineModel<string>({ default: '' })

const { rows = 3, disabled = false } = defineProps<{ rows?: number; disabled?: boolean }>()
const textareaClass = computed(() => tv(theme)())
const field = useTemplateRef<HTMLTextAreaElement>('field')

/** Puts the caret in the field, for a form that opens on it. */
function focus() {
  field.value?.focus()
}
defineExpose({ focus })
</script>

<template>
  <textarea ref="field" v-model="model" :rows="rows" :disabled="disabled" :class="textareaClass" />
</template>
