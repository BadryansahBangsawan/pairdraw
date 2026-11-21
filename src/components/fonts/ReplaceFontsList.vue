<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import FontPicker from '@/components/font-picker/FontPicker.vue'
import type { ReplaceFontRow } from '@/components/fonts/replace-fonts-rows'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

const { fonts } = useI18n()
const rows = defineModel<ReplaceFontRow[]>({ required: true })
const { stylesFor } = defineProps<{ stylesFor: (family: string) => string[] }>()
</script>

<template>
  <div class="grid gap-1" data-test-id="replace-fonts-rows">
    <div
      v-for="row in rows"
      :key="`${row.font.family}:${row.font.style}`"
      data-test-id="replace-fonts-row"
      data-missing="row.font.missing || undefined"
      class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-panel-field sm:grid-cols-[auto_minmax(0,1fr)_10rem_8.5rem]"
    >
      <AppCheckbox v-model="row.selected" :ariaLabel="`${row.font.family} ${row.font.style}`" />
      <div class="flex min-w-0 items-baseline gap-2">
        <span class="truncate text-xs font-medium text-surface">
          {{ row.font.family }} {{ row.font.style }}
        </span>
        <span
          v-if="row.font.missing"
          data-test-id="replace-fonts-missing"
          class="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning"
        >
          {{ fonts.missingFont }}
        </span>
        <span class="shrink-0 text-[10px] text-muted">
          {{
            row.font.layerCount === 1
              ? fonts.usedByOneLayer
              : fonts.usedByLayers({ count: row.font.layerCount })
          }}
        </span>
      </div>
      <div class="col-span-2 flex min-w-0 gap-2 sm:col-span-2 sm:contents">
        <div class="min-w-0 flex-1">
          <FontPicker v-model="row.targetFamily" :label="fonts.replaceWith" />
        </div>
        <select
          v-model="row.targetStyle"
          data-test-id="replace-fonts-style"
          :aria-label="fonts.fontStyle"
          class="h-7 min-w-0 rounded-field border border-border bg-panel-field px-1.5 text-xs text-surface outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:w-full"
        >
          <option v-for="style in stylesFor(row.targetFamily)" :key="style" :value="style">
            {{ style }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
