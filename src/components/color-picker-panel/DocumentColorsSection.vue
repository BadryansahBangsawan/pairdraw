<script setup lang="ts">
import { useDocumentColors } from '@pairdraw/vue/controls/document-colors'

import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

const { panels, update, cssColor } = useColorPickerPanelContext()
const colors = useDocumentColors()
</script>

<template>
  <section v-if="colors.length > 0" class="flex flex-col gap-1">
    <p class="text-[11px] font-medium text-muted">{{ panels.documentColors }}</p>
    <div class="grid grid-cols-8 gap-1">
      <button
        v-for="entry in colors"
        :key="`${entry.color.r},${entry.color.g},${entry.color.b},${entry.color.a}`"
        type="button"
        :aria-label="cssColor(entry.color)"
        class="size-4 cursor-pointer rounded-sm border border-border p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        :style="{ background: cssColor(entry.color) }"
        @click="update(entry.color)"
      />
    </div>
  </section>
</template>
