<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { onMounted, ref, useTemplateRef } from 'vue'

import cellInputTheme from '@/theme/variables/cell-input'

/**
 * Edits one cell of the token list in place. Enter or leaving the field commits, Escape cancels,
 * and keys stay in the field instead of moving the list's highlight.
 */
const { value, label } = defineProps<{ value: string; label: string }>()
const emit = defineEmits<{ commit: [text: string]; cancel: [] }>()

const ui = tv(cellInputTheme)()
const draft = ref(value)
const input = useTemplateRef('input')
let done = false
let settleUntil = 0

onMounted(() => {
  takeFocus()
  // A menu closing as the field appears hands focus to its trigger or the dialog's scope for a
  // frame or two; the field, opened by the person's choice, keeps it.
  settleUntil = performance.now() + 250
  requestAnimationFrame(settle)
})

/** While the field settles, takes focus back from anything that is not another field. */
function settle() {
  if (performance.now() > settleUntil) return
  takeFocus()
  requestAnimationFrame(settle)
}

function takeFocus() {
  const field = input.value
  const active = document.activeElement
  if (!field || active === field) return
  // Leave focus alone once the person has moved to another field.
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
  field.focus()
  field.select()
}

function onBlur() {
  // A steal while the field settles is not the person leaving it.
  if (performance.now() < settleUntil) {
    requestAnimationFrame(takeFocus)
    return
  }
  finish(true)
}

function finish(commit: boolean) {
  if (done) return
  done = true
  if (commit) emit('commit', draft.value)
  else emit('cancel')
}

function onKeydown(event: KeyboardEvent) {
  event.stopPropagation()
  if (event.code === 'Enter' || event.code === 'NumpadEnter') finish(true)
  else if (event.code === 'Escape') finish(false)
}
</script>

<template>
  <input
    ref="input"
    v-model="draft"
    :aria-label="label"
    :class="ui.base()"
    data-test-id="variables-cell-input"
    @keydown="onKeydown"
    @click.stop
    @dblclick.stop
    @pointerdown.stop
    @blur="onBlur"
  />
</template>
