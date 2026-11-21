<script setup lang="ts">
import { computed } from 'vue'

import { useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import {
  createDesignMemoryFromDocument,
  openDesignMemoryDialog
} from '@/app/editor/design-memory/actions'
import { useDesignMemory } from '@/app/editor/design-memory/use'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

/**
 * The document's design memory at a glance, with nothing selected: what it allows and keeps,
 * and the way to edit it; a document without one offers to make it from its own values.
 */
const messages = useDesignMemoryMessages()
const { store, memory, report } = useDesignMemory()

const summary = computed(() => {
  const current = report.value
  if (!current || !memory.value) return []
  const { colors, fonts, fontSizes } = current.groups
  return [
    messages.value.colorCount(colors.allowed.length + colors.more),
    messages.value.fontCount(fonts.allowed.length + fonts.more),
    messages.value.sizeCount(fontSizes.allowed.length + fontSizes.more),
    messages.value.decisionCount(memory.value.decisions.length),
    messages.value.exampleCount(memory.value.examples.length)
  ]
})
</script>

<template>
  <PanelSection :label="messages.designMemory" data-test-id="design-memory-section">
    <template v-if="memory" #actions>
      <IconButton :label="messages.editDesignMemory" @click="openDesignMemoryDialog(store)">
        <icon-lucide-square-arrow-out-up-right class="size-3.5" />
      </IconButton>
    </template>
    <ul v-if="memory" class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      <li v-for="item in summary" :key="item">{{ item }}</li>
    </ul>
    <div v-else class="mt-1 flex flex-col items-start gap-2">
      <p class="text-[11px] text-muted">{{ messages.emptyHint }}</p>
      <AppButton
        size="xs"
        data-test-id="design-memory-create"
        @click="createDesignMemoryFromDocument(store)"
      >
        {{ messages.createFromDocument }}
      </AppButton>
    </div>
  </PanelSection>
</template>
