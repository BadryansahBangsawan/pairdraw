<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useSlidesMessages } from '@pairdraw/vue/i18n'

import IconButton from '@/components/ui/button/IconButton.vue'
import theme from '@/theme/slides/row'

/**
 * A slide in the Slides panel: its number, its thumbnail (the default slot), and its name. A
 * click selects and shows the slide, a double click presents from it, and Alt with the up or
 * down arrow moves it one place.
 */
const {
  number,
  name,
  selected = false,
  dragging = false,
  dropPosition,
  hintId
} = defineProps<{
  /** The slide's place in the deck, from 1. */
  number: number
  name: string
  selected?: boolean
  dragging?: boolean
  /** Where a slide dragged over this one would land. */
  dropPosition?: 'before' | 'after'
  /** The element that tells how to reorder slides, which the slide's button refers to. */
  hintId?: string
}>()
const emit = defineEmits<{ select: []; present: []; move: [step: 1 | -1] }>()
const messages = useSlidesMessages()
const styles = computed(() => tv(theme)({ selected, dragging, dropPosition }))

function onKeydown(event: KeyboardEvent) {
  if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return
  if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return
  event.preventDefault()
  emit('move', event.code === 'ArrowUp' ? -1 : 1)
}
</script>

<template>
  <li
    data-test-id="slides-item"
    :data-selected="selected || undefined"
    :data-dragging="dragging || undefined"
    :data-drop-position="dropPosition"
    :class="styles.root()"
  >
    <div
      v-if="dropPosition === 'before'"
      data-test-id="slides-drop-indicator"
      :class="styles.dropIndicator()"
    />
    <span :class="styles.number()" aria-hidden="true">{{ number }}</span>
    <button
      type="button"
      data-test-id="slides-item-card"
      :aria-label="messages.slideLabel({ number, name })"
      :aria-current="selected || undefined"
      :aria-describedby="hintId"
      :class="styles.card()"
      @click="emit('select')"
      @dblclick="emit('present')"
      @keydown="onKeydown"
    >
      <span :class="styles.frame()">
        <slot />
      </span>
      <span :class="styles.name()">{{ name }}</span>
    </button>
    <IconButton
      :label="messages.presentFromSlide"
      data-test-id="slides-item-present"
      :class="styles.present()"
      @click="emit('present')"
    >
      <icon-lucide-play class="size-3.5" />
    </IconButton>
    <div
      v-if="dropPosition === 'after'"
      data-test-id="slides-drop-indicator"
      :class="styles.dropIndicator()"
    />
  </li>
</template>
