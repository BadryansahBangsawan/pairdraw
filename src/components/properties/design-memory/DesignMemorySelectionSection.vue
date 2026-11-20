<script setup lang="ts">
import { computed } from 'vue'

import { useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import { learnDesignMemory, toggleDesignExamples } from '@/app/editor/design-memory/actions'
import { useDesignMemory } from '@/app/editor/design-memory/use'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

/** Layers that hold a design, which a memory learns from or keeps as an example. */
const DESIGN_TYPES = new Set([
  'FRAME',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'GROUP'
])

/**
 * The selected frames and the design memory: learn rules from the values they use, and pin
 * them as examples agents follow.
 */
const messages = useDesignMemoryMessages()
const { store, memory } = useDesignMemory()

const nodeIds = computed(() =>
  [...store.state.selectedIds].filter((id) => DESIGN_TYPES.has(store.graph.getNode(id)?.type ?? ''))
)
const pinned = computed(() => {
  const examples = new Set(memory.value?.examples.map((example) => example.nodeId))
  return nodeIds.value.length > 0 && nodeIds.value.every((id) => examples.has(id))
})
</script>

<template>
  <PanelSection
    v-if="nodeIds.length > 0"
    :label="messages.designMemory"
    empty
    data-test-id="design-memory-selection-section"
  >
    <template #actions>
      <IconButton
        v-if="memory"
        :label="pinned ? messages.unpinExample : messages.pinExample"
        :aria-pressed="pinned"
        data-test-id="design-memory-pin"
        @click="toggleDesignExamples(store, nodeIds)"
      >
        <icon-lucide-pin-off v-if="pinned" class="size-3.5" />
        <icon-lucide-pin v-else class="size-3.5" />
      </IconButton>
      <IconButton
        :label="messages.learn"
        data-test-id="design-memory-learn"
        @click="learnDesignMemory(store, nodeIds)"
      >
        <icon-lucide-wand-sparkles class="size-3.5" />
      </IconButton>
    </template>
  </PanelSection>
</template>
