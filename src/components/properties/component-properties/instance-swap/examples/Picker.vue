<script setup lang="ts">
import { ref } from 'vue'

import type { AppPickerItem } from '@/components/ui/select/AppPicker.vue'

import InstanceSwapPicker from '../InstanceSwapPicker.vue'

const { disabled = false } = defineProps<{
  /** The instance sits in a library's component, which is changed in the library. */
  disabled?: boolean
}>()

const items: AppPickerItem[] = [
  { value: 'icon-check', label: 'Icon / Check' },
  { value: 'icon-close', label: 'Icon / Close' },
  { value: 'icon-star', label: 'Icon / Star' },
  // A component that holds this instance's own component cannot show inside it.
  { value: 'card', label: 'Card', disabled: true }
]
const selected = ref('icon-check')
</script>

<template>
  <div class="flex items-center gap-2 p-4 text-xs">
    <InstanceSwapPicker
      :items="items"
      :selected="selected"
      :disabled="disabled"
      @select="selected = $event"
    />
    <span>{{ selected }}</span>
  </div>
</template>
