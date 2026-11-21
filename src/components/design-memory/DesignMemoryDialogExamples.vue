<script setup lang="ts">
import { useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import { showDesignExample } from '@/app/editor/design-memory/actions'
import { useDesignMemory } from '@/app/editor/design-memory/use'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'

/** Frames pinned as examples agents follow; one the document lost shows as missing. */
const messages = useDesignMemoryMessages()
const { store, report, change } = useDesignMemory()

function remove(id: string) {
  change((current) => ({
    ...current,
    examples: current.examples.filter((example) => example.nodeId !== id)
  }))
}
</script>

<template>
  <div v-if="report" class="flex flex-col gap-2" data-test-id="design-memory-examples">
    <AppPlaceholder
      v-if="report.examples.length === 0"
      :label="messages.noExamplesYet"
      :description="messages.noExamples"
      :fill="false"
      size="compact"
    />
    <ul v-else class="flex flex-col gap-1">
      <li
        v-for="example in report.examples"
        :key="example.id"
        class="flex items-center gap-2 rounded bg-panel-field px-2 py-1 text-[12px]"
      >
        <icon-lucide-frame class="size-3.5 shrink-0 text-muted" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate">
          {{ example.name ?? messages.missingExample }}
        </span>
        <span v-if="example.page" class="truncate text-[11px] text-muted">{{ example.page }}</span>
        <span v-if="example.width !== null" class="text-[11px] text-muted tabular-nums">
          {{ Math.round(example.width) }} × {{ Math.round(example.height ?? 0) }}
        </span>
        <AppButton
          v-if="example.name !== null"
          size="xs"
          variant="ghost"
          @click="showDesignExample(store, example.id)"
        >
          {{ messages.showExample }}
        </AppButton>
        <IconButton :label="messages.removeExample" @click="remove(example.id)">
          <icon-lucide-x class="size-3" />
        </IconButton>
      </li>
    </ul>
  </div>
</template>
