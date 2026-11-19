<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed } from 'vue'

import { colorToCSS } from '@pairdraw/scene-graph/color'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { useRetainedPopup } from '#vue/lifecycle/retention/popup'

import { usePickerGesture, type PickerCancelCause } from './gesture'

export interface ColorPickerUI {
  content?: string
  swatch?: string
}

const {
  color,
  label = 'Edit color',
  ui,
  escapeReverts = false
} = defineProps<{
  color: Color
  label?: string
  ui?: ColorPickerUI
  /**
   * For a colour with no undo history, such as a preference: Escape closing the picker puts back
   * the colour it opened with. Otherwise Escape keeps the edit, as Figma's picker does.
   */
  escapeReverts?: boolean
}>()

const emit = defineEmits<{
  update: [color: Color]
  openChange: [open: boolean]
  /** Ends the edit made so far as one undo step: a press's release, or a change with none held. */
  commit: []
  /**
   * `press`: Escape during a press that changed the colour, or the picker closing during one; the
   * colour from before the press has just come back through `update`. `escape`: with
   * `escapeReverts`, Escape closed the picker after the colour it opened with came back.
   */
  cancel: [cause: PickerCancelCause]
}>()

const swatchBg = computed(() => colorToCSS(color))
let pressColor: Color = { ...color }
const gesture = usePickerGesture({
  open: () => popupOpen.value,
  // The colour the press found when it first changed it, so a change from elsewhere since the
  // press began is not put back.
  beforeChange: () => {
    pressColor = { ...color }
  },
  commit: () => emit('commit'),
  cancel: () => {
    emit('update', pressColor)
    emit('cancel', 'press')
  }
})
const { open: popupOpen, portalActive } = useRetainedPopup(undefined, () => onOpenChange(false))

let openColor: Color = { ...color }

/** A press still held when the picker closes is put back, whichever way it closes. */
function onOpenChange(open: boolean) {
  if (open) openColor = { ...color }
  if (!open) gesture.abort()
  emit('openChange', open)
}

function update(next: Color) {
  gesture.change(() => emit('update', next))
}

function onEscapeKeyDown() {
  if (!escapeReverts) return
  emit('update', openColor)
  emit('cancel', 'escape')
}
</script>

<template>
  <PopoverRoot v-model:open="popupOpen" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <slot name="trigger" :style="{ background: swatchBg }">
        <button
          type="button"
          :aria-label="label"
          :class="ui?.swatch"
          :style="{ background: swatchBg }"
        />
      </slot>
    </PopoverTrigger>

    <PopoverPortal v-if="portalActive">
      <PopoverContent
        :class="ui?.content"
        :side-offset="4"
        side="left"
        data-picker-content
        @escape-key-down="onEscapeKeyDown"
      >
        <slot :color="color" :update="update" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
