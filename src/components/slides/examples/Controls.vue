<script setup lang="ts">
import { ref } from 'vue'

import type { PresentationScale } from '@pairdraw/core'

import SlidesPresentationControls from '../SlidesPresentationControls.vue'

const index = ref(0)
const scale = ref<PresentationScale>('fit')
const exits = ref(0)
const count = 4
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="relative h-28 w-[520px] rounded-lg bg-black">
      <SlidesPresentationControls
        :index="index"
        :count="count"
        :scale="scale"
        exit-shortcut="Esc"
        @previous="index = Math.max(index - 1, 0)"
        @next="index = Math.min(index + 1, count - 1)"
        @scale="scale = $event"
        @exit="exits += 1"
      />
    </div>
    <div class="relative h-28 w-[520px] rounded-lg bg-black">
      <SlidesPresentationControls :index="3" :count="4" scale="actual" idle exit-shortcut="Esc" />
    </div>
    <p class="text-xs text-muted">
      {{ `slide ${index + 1}, ${scale}, exits ${exits}` }}
    </p>
  </div>
</template>
