<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { nextTick, useTemplateRef, watch } from 'vue'

import type { PresentationScale } from '@pairdraw/core'
import { useSlidesMessages } from '@pairdraw/vue/i18n'

import IconButton from '@/components/ui/button/IconButton.vue'
import theme from '@/theme/slides/controls'

/**
 * The presentation's controls: previous and next slide with the slide's place between them,
 * fitted or 100%, and the way out. They fade while the pointer rests (`idle`).
 */
const {
  index,
  count,
  scale,
  idle = false,
  exitShortcut
} = defineProps<{
  /** The shown slide's place, from 0. */
  index: number
  count: number
  scale: PresentationScale
  idle?: boolean
  exitShortcut: string
}>()
const emit = defineEmits<{
  previous: []
  next: []
  scale: [scale: PresentationScale]
  exit: []
}>()
const messages = useSlidesMessages()
const styles = tv(theme)()

const toolbar = useTemplateRef<HTMLElement>('toolbar')
const previousButton = useTemplateRef<InstanceType<typeof IconButton>>('previousButton')
const nextButton = useTemplateRef<InstanceType<typeof IconButton>>('nextButton')
const exitButton = useTemplateRef<InstanceType<typeof IconButton>>('exitButton')

// Next turns off on the last slide and Previous on the first; a focused one hands focus to the
// other way through the deck, so focus never drops out of the controls.
watch(
  () => [index, count],
  () => {
    const focused = document.activeElement
    if (!(focused instanceof HTMLElement) || !toolbar.value?.contains(focused)) return
    const testId = focused.dataset.testId
    void nextTick(() => {
      const atEnd = testId === 'presentation-next' && index >= count - 1
      const atStart = testId === 'presentation-previous' && index <= 0
      if (!atEnd && !atStart) return
      if (count <= 1) exitButton.value?.focus()
      else if (atEnd) previousButton.value?.focus()
      else nextButton.value?.focus()
    })
  },
  { flush: 'pre' }
)
</script>

<template>
  <div
    ref="toolbar"
    role="toolbar"
    data-test-id="presentation-controls"
    :aria-label="messages.presentation"
    :data-idle="idle || undefined"
    :class="styles.root()"
  >
    <IconButton
      ref="previousButton"
      :label="messages.previousSlide"
      size="sm"
      :disabled="index <= 0"
      data-test-id="presentation-previous"
      @click="emit('previous')"
    >
      <icon-lucide-chevron-left class="size-4" />
    </IconButton>
    <span data-test-id="presentation-position" :class="styles.position()">
      {{ messages.position({ number: index + 1, count }) }}
    </span>
    <IconButton
      ref="nextButton"
      :label="messages.nextSlide"
      size="sm"
      :disabled="index >= count - 1"
      data-test-id="presentation-next"
      @click="emit('next')"
    >
      <icon-lucide-chevron-right class="size-4" />
    </IconButton>
    <div :class="styles.divider()" aria-hidden="true" />
    <IconButton
      :label="messages.fitToScreen"
      size="sm"
      toggle
      :active="scale === 'fit'"
      data-test-id="presentation-fit"
      @click="emit('scale', 'fit')"
    >
      <icon-lucide-shrink class="size-4" />
    </IconButton>
    <IconButton
      :label="messages.actualSize"
      size="sm"
      toggle
      :active="scale === 'actual'"
      data-test-id="presentation-actual-size"
      @click="emit('scale', 'actual')"
    >
      <icon-lucide-scan class="size-4" />
    </IconButton>
    <div :class="styles.divider()" aria-hidden="true" />
    <IconButton
      ref="exitButton"
      :label="messages.exitPresentation({ shortcut: exitShortcut })"
      size="sm"
      data-test-id="presentation-exit"
      @click="emit('exit')"
    >
      <icon-lucide-x class="size-4" />
    </IconButton>
  </div>
</template>
