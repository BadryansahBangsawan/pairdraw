<script setup lang="ts">
import type { DocumentEntryAction } from './types'

/** The icon of a document entry's menu item. */
const { action } = defineProps<{ action: DocumentEntryAction }>()
</script>

<template>
  <icon-lucide-square-check v-if="action === 'select'" />
  <icon-lucide-square-dashed v-else-if="action === 'deselect'" />
  <icon-lucide-copy v-else-if="action === 'save-as'" />
  <icon-lucide-clock-fading v-else-if="action === 'remove-recent'" />
  <icon-lucide-trash-2 v-else />
</template>
