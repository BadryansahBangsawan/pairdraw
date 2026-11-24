<script setup lang="ts">
import Tip from '@/components/ui/overlay/Tip.vue'

/** Says why a pill still names a variable that no longer exists in the document. */
const { label } = defineProps<{ label: string }>()
</script>

<template>
  <Tip :label="label">
    <span
      class="ml-1 inline-grid size-3.5 shrink-0 place-items-center rounded-full border border-current/40 text-[9px] leading-none"
      role="img"
      :aria-label="label"
      data-slot="deleted-variable"
      >?</span
    >
  </Tip>
</template>
