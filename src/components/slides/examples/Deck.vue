<script setup lang="ts">
import { ref } from 'vue'

import SlidesPanelItem from '../SlidesPanelItem.vue'

const slides = [
  { id: 'cover', name: 'Cover', tone: 'bg-accent/30' },
  { id: 'problem', name: 'The problem', tone: 'bg-panel-field' },
  { id: 'roadmap', name: 'Roadmap and next steps for the launch', tone: 'bg-panel-field-hover' }
]
const log = ref<string[]>([])
const record = (entry: string) => {
  log.value = [entry, ...log.value].slice(0, 4)
}
</script>

<template>
  <div class="flex gap-6">
    <ol aria-label="Slides on this page" class="flex w-60 flex-col gap-1 rounded-card bg-panel p-2">
      <SlidesPanelItem
        v-for="(slide, index) in slides"
        :key="slide.id"
        :number="index + 1"
        :name="slide.name"
        :selected="index === 1"
        :drop-position="index === 2 ? 'before' : undefined"
        @select="record(`select ${slide.name}`)"
        @present="record(`present ${slide.name}`)"
        @move="record(`move ${slide.name} ${$event}`)"
      >
        <span :class="['size-full', slide.tone]" />
      </SlidesPanelItem>
    </ol>
    <ul class="text-xs text-muted" aria-label="Events">
      <li v-for="entry in log" :key="entry">{{ entry }}</li>
    </ul>
  </div>
</template>
