<script setup lang="ts">
import { SelectItem, SelectItemIndicator, SelectItemText, injectSelectRootContext } from 'reka-ui'
import { computed } from 'vue'

import { useSelectUI } from '@/components/ui/select/select'
import type { ComponentUI } from '@/components/ui/types'
import type theme from '@/theme/select/select'

interface AppSelectItemProps {
  value: string | number
  disabled?: boolean
  textValue?: string
  ui?: Pick<ComponentUI<typeof theme>, 'item' | 'indicator'>
}

const { value, disabled, textValue, ui } = defineProps<AppSelectItemProps>()

const styles = computed(() => useSelectUI(ui))
const select = injectSelectRootContext()

/**
 * A row chooses itself on `pointerup` alone, so an activation that carries no pointer sequence —
 * an assistive press, or a WebView that reports only the click — closed the menu without choosing.
 * The click covers those. A press that came with a pointer already chose through Reka, and is left
 * alone so the value changes once.
 */
let pointerChose = false

function resetPointer() {
  pointerChose = false
}

function markPointer() {
  pointerChose = true
}

function choose(event: MouseEvent) {
  if (pointerChose) {
    pointerChose = false
    return
  }
  if (disabled) return
  event.stopPropagation()
  select.onValueChange(value)
  select.onOpenChange(false)
}
</script>

<template>
  <SelectItem
    :value="value"
    :disabled="disabled"
    :text-value="textValue"
    :class="styles.item"
    @pointerdown="resetPointer"
    @pointerup="markPointer"
    @click="choose"
  >
    <SelectItemIndicator :class="styles.indicator">
      <icon-lucide-check class="size-3" />
    </SelectItemIndicator>
    <SelectItemText><slot /></SelectItemText>
    <slot name="end" />
  </SelectItem>
</template>
