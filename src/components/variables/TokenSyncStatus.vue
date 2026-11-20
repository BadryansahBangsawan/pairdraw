<script setup lang="ts">
import { computed } from 'vue'

import type { TokenDrift } from '@pairdraw/core/io/formats/design-tokens'
import { useI18n } from '@pairdraw/vue/i18n'

import Tip from '@/components/ui/overlay/Tip.vue'

/** How the variables differ from the linked stylesheet; null while nothing is linked. */
const { drift, file } = defineProps<{ drift: TokenDrift[] | null; file: string }>()
const emit = defineEmits<{ review: [] }>()

const { variables } = useI18n()
const count = computed(() => drift?.length ?? 0)
</script>

<template>
  <Tip v-if="drift" :label="file">
    <button
      v-if="count > 0"
      type="button"
      class="flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-warning outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus"
      :aria-label="`${file}: ${variables.syncToReview({ count })}`"
      data-test-id="variables-sync-status"
      @click="emit('review')"
    >
      <icon-lucide-git-compare-arrows class="size-3.5" aria-hidden="true" />
      {{ variables.syncToReview({ count }) }}
    </button>
    <span
      v-else
      class="flex h-6 shrink-0 items-center gap-1 px-1.5 text-xs text-muted"
      data-test-id="variables-sync-status"
    >
      <icon-lucide-check class="size-3.5" aria-hidden="true" />
      {{ variables.syncInSync }}
    </span>
  </Tip>
</template>
