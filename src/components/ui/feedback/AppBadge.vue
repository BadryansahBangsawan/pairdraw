<script setup lang="ts">
import { twMerge } from 'tailwind-merge'
import { computed } from 'vue'

const { ui } = defineProps<{
  ui?: {
    base?: string
  }
}>()

const cls = computed(() =>
  // Light theme's primary reads on the panels but not on the accent tint over them, so the ink
  // that light theme's surface token carries takes over there.
  twMerge(
    'shrink-0 rounded bg-accent/10 px-1 py-px text-[9px] text-primary in-data-[theme=light]:text-surface',
    ui?.base
  )
)
</script>

<template>
  <span :class="cls"><slot /></span>
</template>
