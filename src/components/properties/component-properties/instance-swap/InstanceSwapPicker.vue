<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import IconButton from '@/components/ui/button/IconButton.vue'
import AppPicker, { type AppPickerItem } from '@/components/ui/select/AppPicker.vue'

/** Header action that swaps an instance to another component, listed by name. */
const {
  items,
  selected,
  disabled = false
} = defineProps<{
  items: AppPickerItem[]
  /** The component the instance shows now, marked in the list. */
  selected?: string
  /** The instance cannot be changed here, as a library component's layers cannot. */
  disabled?: boolean
}>()
const emit = defineEmits<{ select: [componentId: string] }>()
const open = defineModel<boolean>('open', { default: false })
const { panels, common } = useI18n()
</script>

<template>
  <AppPicker
    v-model:open="open"
    :heading="panels.swapInstance"
    :items="items"
    :selected="selected"
    :search-placeholder="panels.searchInstances"
    :empty-label="panels.noComponentsFound"
    :close-label="common.close"
    @select="emit('select', $event)"
  >
    <template #trigger>
      <IconButton :label="panels.swapInstance" data-test-id="instance-swap" :disabled="disabled">
        <icon-lucide-replace class="size-3.5" />
      </IconButton>
    </template>
    <template #leading>
      <icon-lucide-component class="size-3.5" />
    </template>
  </AppPicker>
</template>
