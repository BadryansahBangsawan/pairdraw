<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useFileMessages } from '@open-pencil/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import selectionBarTheme from '@/theme/home/selection-bar'

/**
 * What can be done to the documents selected in a Home list. The default slot holds the actions
 * the list offers for all of them; Select all and clearing the selection come after.
 */
const { count, total } = defineProps<{
  /** How many documents are selected. */
  count: number
  /** How many documents the list shows, so Select all hides once all are. */
  total: number
}>()
const emit = defineEmits<{ selectAll: []; clear: [] }>()
const files = useFileMessages()
const styles = tv(selectionBarTheme)()
</script>

<template>
  <div role="group" :aria-label="files.selectionActions" :class="styles.root()">
    <span role="status" :class="styles.count()">{{ files.selectedDocuments(count) }}</span>
    <div :class="styles.actions()">
      <slot />
      <AppButton v-if="count < total" variant="ghost" @click="emit('selectAll')">
        {{ files.selectAllDocuments }}
      </AppButton>
      <IconButton :label="files.clearDocumentSelection" size="sm" @click="emit('clear')">
        <icon-lucide-x class="size-3.5" />
      </IconButton>
    </div>
  </div>
</template>
